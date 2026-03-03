const { createClient } = require('@supabase/supabase-js');
const { ensureAttachmentsFromFiles } = require('@/lib/syncFilesToAttachments');

let supabaseAdmin;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } else supabaseAdmin = null;
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

function parseBody(body, computedFromItems) {
  const status = STATUSES.includes(String(body.status || '').toLowerCase()) ? String(body.status).toLowerCase() : 'draft';
  const amount = computedFromItems?.subtotal != null ? String(computedFromItems.subtotal) : String(body.amount ?? '').trim() || '';
  const tax = String(body.tax ?? '').trim() || '';
  const total = computedFromItems?.total != null ? String(computedFromItems.total) : String(body.total ?? '').trim() || '';
  const lineItems = Array.isArray(body.line_items) ? body.line_items : [];
  const lineItemsJson = lineItems.map(normalizeLineItem).filter((r) => r.item_name || r.unit_price || r.amount);
  return {
    client_id: String(body.clientId ?? ''),
    user_id: body.userId,
    organization_id: body.organizationId || null,
    invoice_number: String(body.invoice_number ?? '').trim() || '',
    invoice_title: String(body.invoice_title ?? '').trim() || '',
    amount,
    tax,
    total,
    date_issued: toDateOnly(body.date_issued),
    due_date: toDateOnly(body.due_date),
    paid_date: toDateOnly(body.paid_date),
    status,
    payment_method: String(body.payment_method ?? '').trim() || '',
    outstanding_balance: String(body.outstanding_balance ?? '').trim() || '',
    file_url: null,
    file_urls: Array.isArray(body.file_urls)
      ? body.file_urls.map((u) => String(u).trim()).filter(Boolean)
      : body.file_url
        ? [String(body.file_url).trim()].filter(Boolean)
        : [],
    related_proposal_id: body.related_proposal_id || null,
    related_project: body.related_project ? String(body.related_project).trim() || null : null,
    linked_contract_id: body.linked_contract_id || null,
    notes: body.notes ? String(body.notes).trim() || null : null,
    line_items: lineItemsJson,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });
  const { userId, clientId, organizationId } = req.body || {};
  if (!userId || !clientId) return res.status(400).json({ error: 'Missing userId or clientId' });
  try {
    if (organizationId) {
      const { data: membership } = await supabaseAdmin.from('org_members').select('organization_id').eq('user_id', userId).eq('organization_id', organizationId).limit(1).single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    }
    const lineItems = Array.isArray(req.body.line_items) ? req.body.line_items : [];
    let computedFromItems = null;
    if (lineItems.length > 0) {
      const subtotal = lineItems.reduce((sum, item) => {
        const a = toNum(item.amount);
        return sum + (a != null ? a : 0);
      }, 0);
      const taxNum = toNum(req.body.tax) || 0;
      computedFromItems = { subtotal: subtotal.toFixed(2), total: (subtotal + taxNum).toFixed(2) };
    }
    const row = parseBody(req.body, computedFromItems);
    if (row.user_id !== userId) return res.status(400).json({ error: 'user_id must match userId' });
    row.file_url = row.file_urls && row.file_urls.length > 0 ? row.file_urls[0] : null;
    const { data, error } = await supabaseAdmin.from('client_invoices').insert(row).select('id').single();
    if (error) {
      console.error('[create-client-invoice]', error);
      return res.status(500).json({ error: 'Failed to create invoice' });
    }
    const fileUrls = Array.isArray(row.file_urls) ? row.file_urls : [];
    if (fileUrls.length > 0) {
      await ensureAttachmentsFromFiles(supabaseAdmin, {
        clientId: row.client_id,
        userId: row.user_id,
        organizationId: row.organization_id,
        fileUrls,
        linkedInvoiceId: data.id,
      });
    }
    return res.status(201).json({ id: data.id, invoice: { ...row, id: data.id } });
  } catch (err) {
    console.error('[create-client-invoice]', err);
    return res.status(500).json({ error: 'Failed to create invoice' });
  }
}
