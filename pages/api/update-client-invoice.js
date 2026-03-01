/**
 * Updates a client invoice. POST body: { userId, invoiceId, organizationId?, ...fields }
 */

const { createClient } = require('@supabase/supabase-js');

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

function parseBody(body, existing) {
  const status = body.status !== undefined
    ? (STATUSES.includes(String(body.status).toLowerCase()) ? String(body.status).toLowerCase() : (existing?.status ?? 'draft'))
    : (existing?.status ?? 'draft');
  return {
    invoice_number: String(body.invoice_number ?? existing?.invoice_number ?? '').trim() || '',
    invoice_title: String(body.invoice_title ?? existing?.invoice_title ?? '').trim() || '',
    amount: String(body.amount ?? existing?.amount ?? '').trim() || '',
    tax: String(body.tax ?? existing?.tax ?? '').trim() || '',
    total: String(body.total ?? existing?.total ?? '').trim() || '',
    date_issued: body.date_issued !== undefined ? toDateOnly(body.date_issued) : (existing?.date_issued ?? null),
    due_date: body.due_date !== undefined ? toDateOnly(body.due_date) : (existing?.due_date ?? null),
    paid_date: body.paid_date !== undefined ? toDateOnly(body.paid_date) : (existing?.paid_date ?? null),
    status,
    payment_method: String(body.payment_method ?? existing?.payment_method ?? '').trim() || '',
    outstanding_balance: String(body.outstanding_balance ?? existing?.outstanding_balance ?? '').trim() || '',
    related_proposal_id: body.related_proposal_id !== undefined ? body.related_proposal_id || null : (existing?.related_proposal_id ?? null),
    related_project: body.related_project !== undefined ? (body.related_project ? String(body.related_project).trim() || null : null) : (existing?.related_project ?? null),
    linked_contract_id: body.linked_contract_id !== undefined ? body.linked_contract_id || null : (existing?.linked_contract_id ?? null),
    notes: body.notes !== undefined ? (body.notes ? String(body.notes).trim() || null : null) : (existing?.notes ?? null),
    updated_at: new Date().toISOString(),
  };
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

    const updates = parseBody(req.body, existing);
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
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-invoice]', err);
    return res.status(500).json({ error: 'Failed to update invoice' });
  }
}
