/**
 * Public API for the payment page. GET with query: invoiceId, token.
 * Returns invoice display data (title, number, amount due, line items, company, client, document)
 * only if token matches. Used by /pay/[invoiceId] so the client sees the same invoice layout as print/email.
 */

import { createClient } from '@supabase/supabase-js';
import { buildInvoiceDocumentPayload } from '@/lib/buildDocumentPayload';

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

function parseNum(v) {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

function buildCompanyForPay(profile, org) {
  const name = (org?.name || profile?.company_name || 'Company').trim() || 'Company';
  const logoUrl = (org?.logo_url || profile?.company_logo || '').trim() || undefined;
  let addressLines = [];
  if (org?.address_line_1?.trim()) {
    addressLines = [org.address_line_1.trim()];
    if (org.address_line_2?.trim()) addressLines.push(org.address_line_2.trim());
    const cityStateZip = [org.city, org.state, org.postal_code].filter(Boolean).map((s) => String(s).trim()).join(', ');
    if (cityStateZip) addressLines.push(cityStateZip);
    if (org.country?.trim()) addressLines.push(org.country.trim());
  } else {
    const profileJson = profile?.profile && typeof profile.profile === 'object' ? profile.profile : {};
    addressLines = Array.isArray(profileJson.companyAddressLines)
      ? profileJson.companyAddressLines.filter(Boolean)
      : profileJson.companyAddress ? [String(profileJson.companyAddress).trim()].filter(Boolean) : [];
  }
  const phone = (org?.phone && String(org.phone).trim())
    || (profile?.profile?.companyPhone && String(profile.profile.companyPhone).trim())
    || undefined;
  const website = (org?.website && String(org.website).trim())
    || (profile?.profile?.companyWebsite && String(profile.profile.companyWebsite).trim())
    || undefined;
  return {
    name,
    ...(logoUrl && { logoUrl }),
    ...(addressLines.length > 0 && { addressLines }),
    ...(phone && { phone }),
    ...(website && { website }),
  };
}

function buildClientForPay(profile, invoiceClientId, fallbackEmail) {
  let name = '';
  let email = fallbackEmail || '';
  let addressLines = [];
  let contactName = '';
  if (invoiceClientId && profile?.clients && Array.isArray(profile.clients)) {
    const client = profile.clients.find((c) => c.id === invoiceClientId);
    if (client) {
      name = (client.name || client.companyName || client.company || '').trim()
        || (client.firstName || client.lastName ? [client.firstName, client.lastName].filter(Boolean).join(' ') : '');
      if (client.email) email = String(client.email).trim();
      contactName = (client.contactName || client.contact || '').trim();
      const billing = client.billingAddress || {};
      const company = client.companyAddress || {};
      const line1 = billing.address1 || billing.address || company.address1 || company.address || '';
      const line2 = billing.address2 || company.address2 || '';
      addressLines = [line1, line2].filter(Boolean);
    }
  }
  if (!name) name = email || 'Customer';
  return {
    name,
    ...(email && { email }),
    ...(addressLines.length > 0 && { addressLines }),
    ...(contactName && contactName !== name && { contactName }),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { invoiceId, token } = req.query || {};
  if (!invoiceId || !token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ error: 'Missing invoiceId or token' });
  }

  try {
    const { data: invoice, error } = await supabaseAdmin
      .from('client_invoices')
      .select('id, invoice_title, invoice_number, total, outstanding_balance, status, payment_token, line_items, tax, discount, date_issued, due_date, client_id, user_id, organization_id, client_snapshot')
      .eq('id', invoiceId)
      .limit(1)
      .single();

    if (error || !invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.payment_token !== token.trim()) return res.status(403).json({ error: 'Invalid link' });
    if (invoice.status === 'void') return res.status(400).json({ error: 'This invoice is void' });

    const total = parseNum(invoice.total);
    const balance = invoice.outstanding_balance != null && String(invoice.outstanding_balance).trim() !== ''
      ? parseNum(invoice.outstanding_balance)
      : total;
    const alreadyPaid = balance <= 0;

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('company_name, company_logo, profile, clients')
      .eq('id', invoice.user_id)
      .limit(1)
      .maybeSingle();

    let org = null;
    if (invoice.organization_id) {
      const { data: orgRow } = await supabaseAdmin
        .from('organizations')
        .select('name, logo_url, address_line_1, address_line_2, city, state, postal_code, country, phone, website')
        .eq('id', invoice.organization_id)
        .limit(1)
        .maybeSingle();
      org = orgRow || null;
    }

    const company = buildCompanyForPay(profile || {}, org);
    const snapshot = invoice.client_snapshot && typeof invoice.client_snapshot === 'object' && invoice.client_snapshot.name
      ? {
          name: String(invoice.client_snapshot.name).trim() || 'Customer',
          ...(invoice.client_snapshot.email && String(invoice.client_snapshot.email).trim() && { email: String(invoice.client_snapshot.email).trim() }),
          ...(Array.isArray(invoice.client_snapshot.addressLines) && invoice.client_snapshot.addressLines.length > 0 && { addressLines: invoice.client_snapshot.addressLines.filter(Boolean) }),
        }
      : null;
    const client = snapshot || buildClientForPay(profile || {}, invoice.client_id, null);

    const docPayload = buildInvoiceDocumentPayload(invoice);
    const document = {
      ...docPayload,
      subtotal: Number(docPayload.subtotal) || 0,
      tax: Number(docPayload.tax) || 0,
      discount: Number(docPayload.discount) || 0,
      total: Number(docPayload.total) || total,
      amountDue: alreadyPaid ? 0 : (Number(docPayload.amountDue) || total),
    };

    const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
    const base = {
      id: invoice.id,
      title: invoice.invoice_title || 'Invoice',
      number: invoice.invoice_number || '',
      amountDue: alreadyPaid ? 0 : balance,
      total,
      currency: 'USD',
      lineItems,
      alreadyPaid,
      company,
      client,
      document,
    };

    return res.status(200).json({ ok: true, invoice: base });
  } catch (err) {
    console.error('[get-invoice-for-pay]', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
