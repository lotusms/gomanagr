/**
 * Stripe webhook handler. Receives checkout.session.completed and payment_intent.succeeded.
 * Verifies signature, updates the invoice, then sends receipt to customer and payment notification to invoice owner / org superadmin.
 */

import Stripe from 'stripe';
import getRawBody from 'raw-body';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: { bodyParser: false },
};

let supabaseAdmin;
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } else {
    supabaseAdmin = null;
  }
} catch (e) {
  supabaseAdmin = null;
}

async function sendEmail(to, subject, html) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL || '';
  const fromName = process.env.SMTP_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';
  if (smtpHost && smtpUser && smtpPass && fromEmail) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const transporter = nodemailer.createTransport({ host: smtpHost, port, secure, auth: { user: smtpUser, pass: smtpPass } });
    const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
    await transporter.sendMail({ from, to, subject, html });
    return;
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const { error } = await resend.emails.send({ from, to: [to], subject, html });
    if (error) throw error;
    return;
  }
  console.warn('[webhooks/stripe] No email transport (SMTP or RESEND_API_KEY) configured; skipping send');
}

function formatMoney(value, currency = 'USD') {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(n)) return '—';
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sym}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !secretKey || !supabaseAdmin) {
    console.error('[webhooks/stripe] Missing STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, or Supabase');
    return res.status(500).end();
  }

  let event;
  try {
    const rawBody = await getRawBody(req, { limit: '2mb' });
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).send('Missing stripe-signature header');
    }
    const stripe = new Stripe(secretKey);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[webhooks/stripe] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    let invoiceId = null;
    let paymentIntentObject = null;
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      invoiceId = session.metadata?.invoice_id;
      if (!invoiceId) {
        console.warn('[webhooks/stripe] checkout.session.completed missing metadata.invoice_id');
        return res.status(200).json({ received: true });
      }
      if (session.payment_status !== 'paid') {
        return res.status(200).json({ received: true });
      }
    } else if (event.type === 'payment_intent.succeeded') {
      paymentIntentObject = event.data.object;
      invoiceId = paymentIntentObject.metadata?.invoice_id;
      if (!invoiceId && paymentIntentObject.id) {
        const { data: row } = await supabaseAdmin
          .from('client_invoices')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntentObject.id)
          .limit(1)
          .maybeSingle();
        if (row?.id) invoiceId = row.id;
      }
      if (!invoiceId) {
        console.warn('[webhooks/stripe] payment_intent.succeeded could not resolve invoice (metadata or stripe_payment_intent_id)');
        return res.status(200).json({ received: true });
      }
    } else {
      return res.status(200).json({ received: true });
    }

    console.log('[webhooks/stripe] Processing payment for invoice:', invoiceId);

    // Update Supabase client_invoices so the invoice shows as paid in GoManagr (status, balance, paid_date).
    const { data: existingInvoice } = await supabaseAdmin
      .from('client_invoices')
      .select('id, status')
      .eq('id', invoiceId)
      .single();

    if (!existingInvoice) {
      console.warn('[webhooks/stripe] Invoice not found:', invoiceId);
      return res.status(200).json({ received: true });
    }
    if (existingInvoice.status === 'paid') {
      console.log('[webhooks/stripe] Invoice already marked paid (idempotent):', invoiceId);
      return res.status(200).json({ received: true });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { error: updateError } = await supabaseAdmin
      .from('client_invoices')
      .update({
        status: 'paid',
        outstanding_balance: '0',
        paid_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('[webhooks/stripe] Failed to update Supabase client_invoices:', invoiceId, updateError);
      return res.status(500).json({ error: 'Database update failed' });
    }

    console.log('[webhooks/stripe] Supabase client_invoices updated to paid:', invoiceId);

    const { data: invoice } = await supabaseAdmin
      .from('client_invoices')
      .select('invoice_number, invoice_title, total, user_id, organization_id, client_snapshot')
      .eq('id', invoiceId)
      .single();

    if (!invoice) return res.status(200).json({ received: true });

    const amountStr = formatMoney(invoice.total, 'USD');
    const invNum = invoice.invoice_number || invoiceId;
    const invTitle = invoice.invoice_title || 'Invoice';
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';

    const receiptHtml = `
      <p>Your payment for <strong>${invTitle}</strong> (Invoice #${invNum}) has been received.</p>
      <p><strong>Amount paid:</strong> ${amountStr}</p>
      <p>Thank you for your business.</p>
      <p>— ${appName}</p>
    `;
    const notificationHtml = `
      <p>A payment has been received for an invoice.</p>
      <p><strong>Invoice:</strong> ${invTitle} (#${invNum})</p>
      <p><strong>Amount:</strong> ${amountStr}</p>
      <p>— ${appName}</p>
    `;

    let customerEmail = invoice.client_snapshot?.email && String(invoice.client_snapshot.email).trim();
    if (!customerEmail && paymentIntentObject) {
      const email = paymentIntentObject.receipt_email || paymentIntentObject.charges?.data?.[0]?.billing_details?.email;
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) customerEmail = String(email).trim();
      if (!customerEmail && paymentIntentObject.id) {
        try {
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
          const pi = await stripe.paymentIntents.retrieve(paymentIntentObject.id, { expand: ['charges.data.billing_details'] });
          const chargeEmail = pi.charges?.data?.[0]?.billing_details?.email;
          if (chargeEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chargeEmail)) customerEmail = String(chargeEmail).trim();
        } catch (_) {
          // ignore
        }
      }
    }
    if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      try {
        await sendEmail(
          customerEmail,
          `Payment receipt – Invoice #${invNum}`,
          receiptHtml
        );
        console.log('[webhooks/stripe] Receipt email sent to:', customerEmail);
      } catch (e) {
        console.error('[webhooks/stripe] Failed to send receipt to customer:', e.message);
      }
    } else if (!customerEmail) {
      console.warn('[webhooks/stripe] No customer email for receipt (invoice', invoiceId, ')');
    }

    let ownerEmail = null;
    if (invoice.organization_id) {
      const { data: superadmin } = await supabaseAdmin
        .from('org_members')
        .select('user_id')
        .eq('organization_id', invoice.organization_id)
        .eq('role', 'superadmin')
        .limit(1)
        .maybeSingle();
      if (superadmin?.user_id) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('email')
          .eq('id', superadmin.user_id)
          .maybeSingle();
        if (profile?.email) ownerEmail = profile.email.trim();
      }
    }
    if (!ownerEmail && invoice.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('id', invoice.user_id)
        .maybeSingle();
      if (profile?.email) ownerEmail = profile.email.trim();
    }
    if (ownerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      try {
        await sendEmail(
          ownerEmail,
          `Payment received – Invoice #${invNum} (${amountStr})`,
          notificationHtml
        );
        console.log('[webhooks/stripe] Payment notification sent to owner/superadmin:', ownerEmail);
      } catch (e) {
        console.error('[webhooks/stripe] Failed to send payment notification to owner:', e.message);
      }
    } else {
      console.warn('[webhooks/stripe] No owner/superadmin email for notification (invoice', invoiceId, ')');
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhooks/stripe]', err);
    return res.status(500).json({ error: 'Webhook handler error' });
  }
}
