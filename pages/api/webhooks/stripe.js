/**
 * Stripe webhook handler. Receives checkout.session.completed and payment_intent.succeeded.
 * Verifies signature, updates the invoice, then sends receipt to customer and payment notification to invoice owner / org superadmin.
 */

import Stripe from 'stripe';
import getRawBody from 'raw-body';
import { createClient } from '@supabase/supabase-js';
import { getStripeConfig } from '@/lib/getStripeConfig';
import { renderDocumentToHtml } from '@/lib/renderDocumentToHtml';
import { buildInvoiceDocumentPayload } from '@/lib/buildDocumentPayload';
import { sendTenantEmail } from '@/lib/sendTenantEmail';

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

  const stripeConfig = await getStripeConfig();
  const webhookSecret = stripeConfig.webhookSecret;
  const secretKey = stripeConfig.secretKey;
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
    let paymentAmountCents = 0;
    let stripePiIdForPayment = null;
    let paymentCurrency = 'usd';
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      invoiceId = session.metadata?.invoice_id;
      paymentAmountCents = session.amount_total ?? 0;
      stripePiIdForPayment = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
      paymentCurrency = (session.currency || 'usd').toLowerCase();
      if (!invoiceId) {
        console.warn('[webhooks/stripe] checkout.session.completed missing metadata.invoice_id');
        return res.status(200).json({ received: true });
      }
      if (session.payment_status !== 'paid') {
        return res.status(200).json({ received: true });
      }
    } else if (event.type === 'payment_intent.succeeded') {
      paymentIntentObject = event.data.object;
      paymentAmountCents = paymentIntentObject.amount ?? 0;
      stripePiIdForPayment = paymentIntentObject.id ?? null;
      paymentCurrency = (paymentIntentObject.currency || 'usd').toLowerCase();
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

    // Update Supabase client_invoices: partial or full payment (status, balance, paid_date).
    const { data: existingInvoice } = await supabaseAdmin
      .from('client_invoices')
      .select('id, status, outstanding_balance, total, stripe_payment_intent_id')
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
    // Idempotency: do not re-apply the same payment. Stripe may retry webhooks. We have already
    // applied this PaymentIntent if it is the one on the invoice and status is already partially_paid/paid
    // (stripe_payment_intent_id is set by create-payment-intent before pay, so we skip only when we
    // previously applied this PI — i.e. status was updated by a prior webhook or sync).
    const existingPiId = (existingInvoice.stripe_payment_intent_id && String(existingInvoice.stripe_payment_intent_id).trim()) || '';
    const thisPiId = paymentIntentObject ? paymentIntentObject.id : null;
    const alreadyApplied = thisPiId && existingPiId === thisPiId && (existingInvoice.status === 'partially_paid' || existingInvoice.status === 'paid');
    if (alreadyApplied) {
      console.log('[webhooks/stripe] PaymentIntent already applied (idempotent):', invoiceId);
      return res.status(200).json({ received: true });
    }

    const paymentAmount = paymentAmountCents / 100;
    const currentBalance = existingInvoice.outstanding_balance != null && String(existingInvoice.outstanding_balance).trim() !== ''
      ? parseFloat(String(existingInvoice.outstanding_balance).replace(/[^\d.-]/g, '')) || 0
      : parseFloat(String(existingInvoice.total).replace(/[^\d.-]/g, '')) || 0;
    const newBalance = Math.max(0, currentBalance - paymentAmount);
    const isFullyPaid = newBalance <= 0;
    const today = new Date().toISOString().slice(0, 10);

    const { error: updateError } = await supabaseAdmin
      .from('client_invoices')
      .update({
        status: isFullyPaid ? 'paid' : 'partially_paid',
        outstanding_balance: String(isFullyPaid ? '0' : newBalance.toFixed(2)),
        paid_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('[webhooks/stripe] Failed to update Supabase client_invoices:', invoiceId, updateError);
      return res.status(500).json({ error: 'Database update failed' });
    }

    // Record this payment in invoice_payments for payment history timeline (idempotent by stripe_payment_intent_id).
    const { error: payInsertError } = await supabaseAdmin
      .from('invoice_payments')
      .upsert(
        {
          invoice_id: invoiceId,
          amount_cents: paymentAmountCents,
          currency: paymentCurrency,
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: stripePiIdForPayment || null,
        },
        { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true }
      );
    if (payInsertError && payInsertError.code !== '23505') {
      console.warn('[webhooks/stripe] invoice_payments insert failed (non-fatal):', payInsertError);
    }

    console.log('[webhooks/stripe] Supabase client_invoices updated to paid:', invoiceId);

    const { data: invoice } = await supabaseAdmin
      .from('client_invoices')
      .select('invoice_number, invoice_title, total, user_id, organization_id, client_id, client_snapshot')
      .eq('id', invoiceId)
      .single();

    if (!invoice) return res.status(200).json({ received: true });

    const amountStr = formatMoney(paymentAmount || invoice.total, 'USD');
    const invNum = invoice.invoice_number || invoiceId;
    const invTitle = invoice.invoice_title || 'Invoice';
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';

    const notificationHtml = `
      <p>A payment has been received for an invoice.</p>
      <p><strong>Invoice:</strong> ${invTitle} (#${invNum})</p>
      <p><strong>Amount:</strong> ${amountStr}</p>
      <p>— ${appName}</p>
    `;

    // Resolve client email so we can send them a receipt (every payment: client + org notification).
    let customerEmail = invoice.client_snapshot?.email && String(invoice.client_snapshot.email).trim();
    if (!customerEmail && paymentIntentObject) {
      const email = paymentIntentObject.receipt_email || paymentIntentObject.charges?.data?.[0]?.billing_details?.email;
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) customerEmail = String(email).trim();
      if (!customerEmail && paymentIntentObject.id) {
        try {
          const stripe = new Stripe(secretKey);
          const pi = await stripe.paymentIntents.retrieve(paymentIntentObject.id, { expand: ['charges.data.billing_details'] });
          const chargeEmail = pi.charges?.data?.[0]?.billing_details?.email;
          if (chargeEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chargeEmail)) customerEmail = String(chargeEmail).trim();
        } catch (_) {
          // ignore
        }
      }
    }
    if (!customerEmail && invoice.client_id && invoice.user_id) {
      const { data: creatorProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('clients')
        .eq('id', invoice.user_id)
        .maybeSingle();
      const clients = Array.isArray(creatorProfile?.clients) ? creatorProfile.clients : [];
      const client = clients.find((c) => c.id === invoice.client_id);
      if (client?.email) customerEmail = String(client.email).trim();
    }
    // Send receipt to client (every payment) using tenant's email provider. Skip if no org.
    const orgId = invoice.organization_id || null;
    if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) && orgId) {
      try {
        const { data: fullInvoice } = await supabaseAdmin
          .from('client_invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();
        if (fullInvoice) {
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('company_name, company_logo, clients, profile')
            .eq('id', fullInvoice.user_id)
            .maybeSingle();
          const profileJson = profile?.profile && typeof profile.profile === 'object' ? profile.profile : {};
          let companyName = appName;
          let companyLogoUrl = '';
          let orgName = '';
          let orgLogoUrl = '';
          let orgAddressLines = [];
          let orgPhone = '';
          let orgWebsite = '';
          if (profile?.company_name) companyName = String(profile.company_name).trim();
          if (profile?.company_logo) companyLogoUrl = String(profile.company_logo).trim();
          if (fullInvoice.organization_id) {
            const { data: org } = await supabaseAdmin
              .from('organizations')
              .select('name, logo_url, address_line_1, address_line_2, city, state, postal_code, country, phone, website')
              .eq('id', fullInvoice.organization_id)
              .maybeSingle();
            if (org?.name) orgName = String(org.name).trim();
            if (org?.logo_url) orgLogoUrl = String(org.logo_url).trim();
            if (org?.address_line_1?.trim()) {
              orgAddressLines = [org.address_line_1.trim()];
              if (org.address_line_2?.trim()) orgAddressLines.push(org.address_line_2.trim());
              const cityStateZip = [org.city, org.state, org.postal_code].filter(Boolean).map((s) => String(s).trim()).join(', ');
              if (cityStateZip) orgAddressLines.push(cityStateZip);
              if (org.country?.trim()) orgAddressLines.push(org.country.trim());
            }
            if (org?.phone?.trim()) orgPhone = String(org.phone).trim();
            if (org?.website?.trim()) orgWebsite = String(org.website).trim();
          }
          const displayName = orgName || companyName;
          const displayLogo = orgLogoUrl || companyLogoUrl;
          const profileAddressLines = Array.isArray(profileJson.companyAddressLines) ? profileJson.companyAddressLines.filter(Boolean) : (profileJson.companyAddress ? [String(profileJson.companyAddress).trim()].filter(Boolean) : []);
          const companyAddressLines = orgAddressLines.length > 0 ? orgAddressLines : profileAddressLines;
          let clientName = (fullInvoice.client_snapshot?.name && String(fullInvoice.client_snapshot.name).trim()) || 'Customer';
          let clientAddressLines = [];
          if (fullInvoice.client_id && profile?.clients && Array.isArray(profile.clients)) {
            const client = profile.clients.find((c) => c.id === fullInvoice.client_id);
            if (client) {
              clientName = (client.name || client.companyName || '').trim() || (client.firstName || client.lastName ? [client.firstName, client.lastName].filter(Boolean).join(' ') : '') || clientName;
              const billing = client.billingAddress || {};
              const companyAddr = client.companyAddress || {};
              const line1 = billing.address1 || billing.address || companyAddr.address1 || companyAddr.address || '';
              const line2 = billing.address2 || companyAddr.address2 || '';
              clientAddressLines = [line1, line2].filter(Boolean);
            }
          }
          if (fullInvoice.client_snapshot?.addressLines && Array.isArray(fullInvoice.client_snapshot.addressLines)) {
            clientAddressLines = fullInvoice.client_snapshot.addressLines.filter(Boolean);
          }
          const docPayload = buildInvoiceDocumentPayload(fullInvoice);
          docPayload.amountDue = newBalance;
          docPayload.paidDate = today;
          const receiptHtml = renderDocumentToHtml({
            type: 'receipt',
            company: {
              name: displayName,
              ...(displayLogo && { logoUrl: displayLogo }),
              ...(companyAddressLines.length > 0 && { addressLines: companyAddressLines }),
              ...(orgPhone && { phone: orgPhone }),
              ...(orgWebsite && { website: orgWebsite }),
            },
            client: {
              name: clientName,
              email: customerEmail,
              ...(clientAddressLines.length > 0 && { addressLines: clientAddressLines }),
            },
            document: docPayload,
            currency: 'USD',
            amountPaid: paymentAmount,
          });
          const result = await sendTenantEmail(orgId, { to: customerEmail, subject: `Payment receipt – Receipt #${invNum}`, html: receiptHtml });
          if (result.sent) console.log('[webhooks/stripe] Receipt email sent to client:', customerEmail);
          else console.warn('[webhooks/stripe] Receipt not sent:', result.error);
        } else {
          const fallbackReceiptHtml = `<p>Your payment for <strong>${invTitle}</strong> (Receipt #${invNum}) has been received.</p><p><strong>Amount paid:</strong> ${amountStr}</p><p>Thank you for your business.</p><p>— ${appName}</p>`;
          const result = await sendTenantEmail(orgId, { to: customerEmail, subject: `Payment receipt – Receipt #${invNum}`, html: fallbackReceiptHtml });
          if (result.sent) console.log('[webhooks/stripe] Receipt email (fallback) sent to client:', customerEmail);
          else console.warn('[webhooks/stripe] Receipt not sent:', result.error);
        }
      } catch (e) {
        console.error('[webhooks/stripe] Failed to send receipt to customer:', e.message);
      }
    } else if (!customerEmail) {
      console.warn('[webhooks/stripe] No customer email for receipt (invoice', invoiceId, ')');
    } else if (!orgId) {
      console.warn('[webhooks/stripe] No organization_id for invoice', invoiceId, '; skipping receipt email');
    }

    // Send payment notification to org member(s).
    const adminEmails = new Set();
    if (invoice.organization_id) {
      const { data: orgAdmins } = await supabaseAdmin
        .from('org_members')
        .select('user_id')
        .eq('organization_id', invoice.organization_id)
        .in('role', ['superadmin', 'admin']);
      const userIds = (orgAdmins || []).map((r) => r.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from('user_profiles')
          .select('email')
          .in('id', userIds);
        (profiles || []).forEach((p) => {
          if (p?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.email).trim())) {
            adminEmails.add(String(p.email).trim());
          }
        });
      }
    }
    if (adminEmails.size === 0 && invoice.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('id', invoice.user_id)
        .maybeSingle();
      if (profile?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(profile.email).trim())) {
        adminEmails.add(String(profile.email).trim());
      }
    }
    if (orgId) {
      for (const adminEmail of adminEmails) {
        try {
          const result = await sendTenantEmail(orgId, {
            to: adminEmail,
            subject: `Payment received – Invoice #${invNum} (${amountStr})`,
            html: notificationHtml,
          });
          if (result.sent) console.log('[webhooks/stripe] Payment notification sent to org admin:', adminEmail);
          else console.warn('[webhooks/stripe] Admin notification not sent:', result.error);
        } catch (e) {
          console.error('[webhooks/stripe] Failed to send payment notification to', adminEmail, e.message);
        }
      }
    }
    if (adminEmails.size === 0) {
      console.warn('[webhooks/stripe] No org admin or owner email for notification (invoice', invoiceId, ')');
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhooks/stripe]', err);
    return res.status(500).json({ error: 'Webhook handler error' });
  }
}
