const { createClient } = require('@supabase/supabase-js');

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
const STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];

function parseBody(body) {
  const status = STATUSES.includes(String(body.status || '').toLowerCase()) ? String(body.status).toLowerCase() : 'draft';
  return {
    client_id: String(body.clientId ?? ''),
    user_id: body.userId,
    organization_id: body.organizationId || null,
    proposal_title: String(body.proposal_title ?? '').trim() || '',
    proposal_number: String(body.proposal_number ?? '').trim() || '',
    date_created: toDateOnly(body.date_created),
    date_sent: toDateOnly(body.date_sent),
    expiration_date: toDateOnly(body.expiration_date),
    status,
    estimated_value: String(body.estimated_value ?? '').trim() || '',
    scope_summary: String(body.scope_summary ?? '').trim() || '',
    included_services_products: String(body.included_services_products ?? '').trim() || '',
    terms: String(body.terms ?? '').trim() || '',
    file_url: null,
    file_urls: Array.isArray(body.file_urls)
      ? body.file_urls.map((u) => String(u).trim()).filter(Boolean)
      : body.file_url
        ? [String(body.file_url).trim()].filter(Boolean)
        : [],
    linked_project: body.linked_project ? String(body.linked_project).trim() || null : null,
    linked_contract_id: body.linked_contract_id || null,
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
    const row = parseBody(req.body);
    if (row.user_id !== userId) return res.status(400).json({ error: 'user_id must match userId' });
    row.file_url = row.file_urls && row.file_urls.length > 0 ? row.file_urls[0] : null;
    const { data, error } = await supabaseAdmin.from('client_proposals').insert(row).select('id').single();
    if (error) {
      console.error('[create-client-proposal]', error);
      return res.status(500).json({ error: 'Failed to create proposal' });
    }
    if (row.linked_contract_id) {
      await supabaseAdmin
        .from('client_contracts')
        .update({ related_proposal_id: data.id, updated_at: new Date().toISOString() })
        .eq('id', row.linked_contract_id);
    }
    return res.status(201).json({ id: data.id, proposal: { ...row, id: data.id } });
  } catch (err) {
    console.error('[create-client-proposal]', err);
    return res.status(500).json({ error: 'Failed to create contract' });
  }
}
