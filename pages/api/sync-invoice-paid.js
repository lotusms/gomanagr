/**
 * Syncs invoice to paid in Supabase when Stripe has a succeeded PaymentIntent for it.
 * Two callers:
 * 1) GET with query invoiceId, token — customer landing on pay page after payment (return_url with ?paid=1).
 * 2) POST with body { invoiceId, userId, organizationId? } — org admin opening the edit page; verifies access then syncs.
 * If the stored stripe_payment_intent_id is not succeeded, searches Stripe for any succeeded PI with metadata.invoice_id
 * (handles multiple PIs / customer paid a different attempt).
 * After updating the invoice, sends receipt to client and payment notification to org admin (same as webhook).
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getStripeConfig } from '@/lib/getStripeConfig';
import { renderDocumentToHtml } from '@/lib/renderDocumentToHtml';
import { buildInvoiceDocumentPayload } from '@/lib/buildDocumentPayload';
import { sendTenantEmail } from '@/lib/sendTenantEmail';

function formatMoney(value, currency = 'USD') {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(n)) return '—';
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sym}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

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

/** List all succeeded PaymentIntents for this invoice (multiple partial payments). */
async function listSucceededPaymentIntentsForInvoice(stripe, invoiceId) {
  const list = await stripe.paymentIntents.list({ limit: 100 });
  return list.data.filter(
    (pi) => pi.metadata?.invoice_id === invoiceId && pi.status === 'succeeded'
  );
}

export default async function handler(req, res) {
  if (!supabaseAdmin) {
    return res.status(503).json({ ok: false, error: 'Service unavailable' });
  }

  let invoiceId = null;
  let invoice = null;

  if (req.method === 'GET') {
    const { token } = req.query || {};
    invoiceId = req.query?.invoiceId;
    if (!invoiceId || !token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ ok: false, error: 'Missing invoiceId or token' });
    }
    const { data, error } = await supabaseAdmin
      .from('client_invoices')
      .select('id, organization_id, payment_token, stripe_payment_intent_id, status')
      .eq('id', invoiceId)
      .limit(1)
      .single();
    if (error || !data) {
      return res.status(404).json({ ok: false, error: 'Invoice not found' });
    }
    if (data.payment_token !== token.trim()) {
      return res.status(403).json({ ok: false, error: 'Invalid link' });
    }
    invoice = data;
  } else if (req.method === 'POST') {
    res.setHeader('Allow', 'GET, POST');
    const { userId, organizationId } = req.body || {};
    invoiceId = req.body?.invoiceId;
    if (!invoiceId || !userId) {
      return res.status(400).json({ ok: false, error: 'Missing invoiceId or userId' });
    }
    if (organizationId) {
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
    }
    let query = supabaseAdmin
      .from('client_invoices')
      .select('id, organization_id, payment_token, stripe_payment_intent_id, status')
      .eq('id', invoiceId)
      .limit(1);
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      return res.status(404).json({ ok: false, error: 'Invoice not found' });
    }
    invoice = data;
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeConfig = await getStripeConfig(invoice.organization_id || null);
  const secretKey = stripeConfig.secretKey;
  if (!secretKey || !secretKey.startsWith('sk_')) {
    return res.status(503).json({ ok: false, error: 'Stripe is not configured' });
  }

  if (invoice.status === 'paid') {
    return res.status(200).json({ ok: true, alreadyPaid: true });
  }

  try {
    const stripe = new Stripe(secretKey);
    const succeededPIs = await listSucceededPaymentIntentsForInvoice(stripe, invoiceId);
    if (succeededPIs.length === 0) {
      return res.status(200).json({ ok: true, synced: false });
    }

    // Sum all succeeded payments for this invoice (multiple partial payments) and use latest payment date.
    let totalPaidCents = 0;
    let latestCreated = 0;
    for (const pi of succeededPIs) {
      totalPaidCents += pi.amount ?? 0;
      if (pi.created && pi.created > latestCreated) latestCreated = pi.created;
    }
    const totalPaid = totalPaidCents / 100;
    if (totalPaid <= 0) {
      return res.status(200).json({ ok: true, synced: false });
    }

    const { data: fullInvoice } = await supabaseAdmin
      .from('client_invoices')
      .select('outstanding_balance, total')
      .eq('id', invoiceId)
      .single();

    const total = parseFloat(String(fullInvoice?.total ?? 0).replace(/[^\d.-]/g, '')) || 0;
    const newBalance = Math.max(0, total - totalPaid);
    const isFullyPaid = newBalance <= 0;
    // paid_date = date of the most recent succeeded payment (so "date paid" reflects last payment).
    const paidDate = latestCreated
      ? new Date(latestCreated * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const currentBalance = fullInvoice?.outstanding_balance != null && String(fullInvoice.outstanding_balance).trim() !== ''
      ? parseFloat(String(fullInvoice.outstanding_balance).replace(/[^\d.-]/g, '')) || 0
      : total;
    const currentPaid = total - currentBalance;
    // Skip update if our computed state matches (idempotent).
    if (Math.abs(currentBalance - newBalance) < 0.01 && invoice.status === (isFullyPaid ? 'paid' : 'partially_paid')) {
      return res.status(200).json({ ok: true, alreadySynced: true });
    }

    const updatePayload = {
      status: isFullyPaid ? 'paid' : 'partially_paid',
      outstanding_balance: isFullyPaid ? '0' : newBalance.toFixed(2),
      paid_date: paidDate,
      updated_at: new Date().toISOString(),
    };
    // Keep the most recent PI id on the invoice for reference (last one in list by created).
    const latestPi = succeededPIs.reduce((a, b) => ((a.created ?? 0) >= (b.created ?? 0) ? a : b));
    updatePayload.stripe_payment_intent_id = latestPi.id;

    const { error: updateError } = await supabaseAdmin
      .from('client_invoices')
      .update(updatePayload)
      .eq('id', invoiceId);

    if (updateError) {
      console.error('[sync-invoice-paid] Failed to update Supabase client_invoices:', invoiceId, updateError);
      return res.status(500).json({ ok: false, error: 'Failed to update invoice' });
    }

    console.log('[sync-invoice-paid] Supabase client_invoices updated (total paid from Stripe):', invoiceId, totalPaid);

    const { data: invoiceForEmail } = await supabaseAdmin
      .from('client_invoices')
      .select('invoice_number, invoice_title, total, user_id, organization_id, client_id, client_snapshot')
      .eq('id', invoiceId)
      .single();

    if (invoiceForEmail) {
      const orgIdForEmail = invoiceForEmail.organization_id || null;
      const amountStr = formatMoney(totalPaid, 'USD');
      const invNum = invoiceForEmail.invoice_number || invoiceId;
      const invTitle = invoiceForEmail.invoice_title || 'Invoice';
      const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';

      const notificationHtml = `
        <p>A payment has been received for an invoice.</p>
        <p><strong>Invoice:</strong> ${invTitle} (#${invNum})</p>
        <p><strong>Amount:</strong> ${amountStr}</p>
        <p>— ${appName}</p>
      `;

      let customerEmail = invoiceForEmail.client_snapshot?.email && String(invoiceForEmail.client_snapshot.email).trim();
      if (!customerEmail && invoiceForEmail.client_id && invoiceForEmail.user_id) {
        const { data: creatorProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('clients')
          .eq('id', invoiceForEmail.user_id)
          .maybeSingle();
        const clients = Array.isArray(creatorProfile?.clients) ? creatorProfile.clients : [];
        const client = clients.find((c) => c.id === invoiceForEmail.client_id);
        if (client?.email) customerEmail = String(client.email).trim();
      }
      if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) && orgIdForEmail) {
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
            docPayload.paidDate = paidDate;
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
              amountPaid: totalPaid,
            });
            const result = await sendTenantEmail(orgIdForEmail, { to: customerEmail, subject: `Payment receipt – Receipt #${invNum}`, html: receiptHtml });
            if (result.sent) console.log('[sync-invoice-paid] Receipt email sent to client:', customerEmail);
            else console.warn('[sync-invoice-paid] Receipt not sent:', result.error);
          } else {
            const fallbackReceiptHtml = `<p>Your payment for <strong>${invTitle}</strong> (Receipt #${invNum}) has been received.</p><p><strong>Amount paid:</strong> ${amountStr}</p><p>Thank you for your business.</p><p>— ${appName}</p>`;
            const result = await sendTenantEmail(orgIdForEmail, { to: customerEmail, subject: `Payment receipt – Receipt #${invNum}`, html: fallbackReceiptHtml });
            if (result.sent) console.log('[sync-invoice-paid] Receipt email (fallback) sent to client:', customerEmail);
            else console.warn('[sync-invoice-paid] Receipt not sent:', result.error);
          }
        } catch (e) {
          console.error('[sync-invoice-paid] Failed to send receipt to customer:', e.message);
        }
      } else if (!customerEmail) {
        console.warn('[sync-invoice-paid] No customer email for receipt (invoice', invoiceId, ')');
      } else if (!orgIdForEmail) {
        console.warn('[sync-invoice-paid] No organization_id for invoice', invoiceId, '; skipping receipt email');
      }

      const adminEmails = new Set();
      if (invoiceForEmail.organization_id) {
        const { data: orgAdmins } = await supabaseAdmin
          .from('org_members')
          .select('user_id')
          .eq('organization_id', invoiceForEmail.organization_id)
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
      if (adminEmails.size === 0 && invoiceForEmail.user_id) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('email')
          .eq('id', invoiceForEmail.user_id)
          .maybeSingle();
        if (profile?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(profile.email).trim())) {
          adminEmails.add(String(profile.email).trim());
        }
      }
      if (orgIdForEmail) {
        for (const adminEmail of adminEmails) {
          try {
            const result = await sendTenantEmail(orgIdForEmail, {
              to: adminEmail,
              subject: `Payment received – Invoice #${invNum} (${amountStr})`,
              html: notificationHtml,
            });
            if (result.sent) console.log('[sync-invoice-paid] Payment notification sent to org admin:', adminEmail);
            else console.warn('[sync-invoice-paid] Admin notification not sent:', result.error);
          } catch (e) {
            console.error('[sync-invoice-paid] Failed to send payment notification to', adminEmail, e.message);
          }
        }
      }
      if (adminEmails.size === 0) {
        console.warn('[sync-invoice-paid] No org admin or owner email for notification (invoice', invoiceId, ')');
      }
    }

    return res.status(200).json({ ok: true, synced: true });
  } catch (err) {
    console.error('[sync-invoice-paid]', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong' });
  }
}
