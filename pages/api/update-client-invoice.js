/**
 * Updates a client invoice. POST body: { userId, invoiceId, organizationId?, ...fields }
 * Invoice fields aligned with form and Supabase: see lib/invoiceSchema.js
 */
const { createClient } = require('@supabase/supabase-js');
const { ensureAttachmentsFromFiles } = require('@/lib/syncFilesToAttachments');

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

function toDateOnly(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.includes('T') ? s.slice(0, 10) : s;
}

const STATUSES = ['draft', 'sent', 'overdue', 'paid', 'partially_paid', 'void'];

function toNum(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? null : n;
}

function normalizeLineItem(item) {
  const quantity = toNum(item.quantity);
  const unitPrice = String(item.unit_price ?? '').trim();
  const unitNum = toNum(unitPrice);
  const amount = item.amount != null && String(item.amount).trim() !== ''
    ? String(item.amount).trim()
    : (quantity != null && unitNum != null ? (quantity * unitNum).toFixed(2) : '');
  return {
    item_name: String(item.item_name ?? '').trim() || '',
    description: String(item.description ?? '').trim() || '',
    quantity: quantity != null ? quantity : 1,
    unit_price: unitPrice || '',
    amount: amount || '',
  };
}

function parseBody(body, existing, computedFromItems) {
  const status = body.status !== undefined
    ? (STATUSES.includes(String(body.status).toLowerCase()) ? String(body.status).toLowerCase() : (existing?.status ?? 'draft'))
    : (existing?.status ?? 'draft');
  const amount = computedFromItems?.subtotal != null
    ? String(computedFromItems.subtotal)
    : String(body.amount ?? existing?.amount ?? '').trim() || '';
  const tax = String(body.tax ?? existing?.tax ?? '').trim() || '';
  const discount = String(body.discount ?? existing?.discount ?? '').trim() || '';
  const total = computedFromItems?.total != null
    ? String(computedFromItems.total)
    : String(body.total ?? existing?.total ?? '').trim() || '';
  const clientIdValue = body.client_id !== undefined ? (body.client_id || null) : (body.clientId !== undefined ? (body.clientId || null) : (existing?.client_id ?? null));
  const out = {
    client_id: clientIdValue,
    invoice_number: String(body.invoice_number ?? existing?.invoice_number ?? '').trim() || '',
    invoice_title: String(body.invoice_title ?? existing?.invoice_title ?? '').trim() || '',
    amount,
    tax,
    discount,
    total,
    date_issued: body.date_issued !== undefined ? toDateOnly(body.date_issued) : (existing?.date_issued ?? null),
    due_date: body.due_date !== undefined ? toDateOnly(body.due_date) : (existing?.due_date ?? null),
    paid_date: body.paid_date !== undefined ? toDateOnly(body.paid_date) : (existing?.paid_date ?? null),
    status,
    payment_method: String(body.payment_method ?? existing?.payment_method ?? '').trim() || '',
    payment_terms: body.payment_terms !== undefined ? (body.payment_terms ? String(body.payment_terms).trim() || null : null) : (existing?.payment_terms ?? null),
    outstanding_balance: body.outstanding_balance !== undefined ? String(body.outstanding_balance ?? '').trim() || '' : (existing?.outstanding_balance ?? ''),
    related_proposal_id: body.related_proposal_id !== undefined ? body.related_proposal_id || null : (existing?.related_proposal_id ?? null),
    related_project: body.related_project !== undefined ? (body.related_project ? String(body.related_project).trim() || null : null) : (existing?.related_project ?? null),
    linked_contract_id: body.linked_contract_id !== undefined ? body.linked_contract_id || null : (existing?.linked_contract_id ?? null),
    terms: body.terms !== undefined ? (body.terms ? String(body.terms).trim() || null : null) : (existing?.terms ?? null),
    scope_summary: body.scope_summary !== undefined ? (body.scope_summary ? String(body.scope_summary).trim() || null : null) : (existing?.scope_summary ?? null),
    ever_sent: body.ever_sent !== undefined ? Boolean(body.ever_sent) : (existing?.ever_sent ?? false),
    date_sent: body.date_sent !== undefined ? toDateOnly(body.date_sent) : (existing?.date_sent ?? null),
    updated_at: new Date().toISOString(),
  };
  if (body.line_items !== undefined) {
    const lineItems = Array.isArray(body.line_items) ? body.line_items : [];
    out.line_items = lineItems.map(normalizeLineItem).filter((r) => r.item_name || r.unit_price || r.amount);
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { userId, invoiceId, organizationId } = req.body || {};
  if (!userId || !invoiceId) return res.status(400).json({ error: 'Missing userId or invoiceId' });

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_invoices')
      .select('*')
      .eq('id', invoiceId)
      .limit(1)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Invoice not found' });

    if (organizationId) {
      if (existing.organization_id !== organizationId) return res.status(403).json({ error: 'Invoice does not belong to this organization' });
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    } else {
      if (existing.organization_id != null || existing.user_id !== userId) return res.status(403).json({ error: 'Invoice does not belong to you' });
    }

    const lineItems = Array.isArray(req.body.line_items) ? req.body.line_items : [];
    let computedFromItems = null;
    if (lineItems.length > 0) {
      const subtotal = lineItems.reduce((sum, item) => {
        const a = toNum(item.amount);
        return sum + (a != null ? a : 0);
      }, 0);
      const taxNum = toNum(req.body.tax) || 0;
      const discountNum = toNum(req.body.discount) || 0;
      computedFromItems = { subtotal: subtotal.toFixed(2), total: (subtotal + taxNum - discountNum).toFixed(2) };
    }
    const updates = parseBody(req.body, existing, computedFromItems);
    if (req.body?.file_urls !== undefined) {
      updates.file_urls = Array.isArray(req.body.file_urls)
        ? req.body.file_urls.map((u) => String(u).trim()).filter(Boolean)
        : [];
      updates.file_url = updates.file_urls.length > 0 ? updates.file_urls[0] : null;
    }
    const { error: updateErr } = await supabaseAdmin.from('client_invoices').update(updates).eq('id', invoiceId);
    if (updateErr) {
      console.error('[update-client-invoice]', updateErr);
      return res.status(500).json({ error: 'Failed to update invoice' });
    }
    const fileUrls = Array.isArray(updates.file_urls) ? updates.file_urls : [];
    if (fileUrls.length > 0) {
      await ensureAttachmentsFromFiles(supabaseAdmin, {
        clientId: updates.client_id ?? existing.client_id,
        userId: existing.user_id,
        organizationId: existing.organization_id,
        fileUrls,
        linkedInvoiceId: invoiceId,
      });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-invoice]', err);
    return res.status(500).json({ error: 'Failed to update invoice' });
  }
}
