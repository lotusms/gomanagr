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
const STATUSES = ['draft', 'active', 'inactive', 'completed', 'abandoned'];
const CONTRACT_TYPES = ['service_agreement', 'retainer_agreement', 'maintenance_agreement', 'nda', 'vendor_agreement'];

function parseBody(body) {
  const status = STATUSES.includes(String(body.status || '').toLowerCase()) ? String(body.status).toLowerCase() : 'draft';
  const contractType = body.contract_type && CONTRACT_TYPES.includes(String(body.contract_type)) ? body.contract_type : null;
  return {
    client_id: String(body.clientId ?? ''),
    user_id: body.userId,
    organization_id: body.organizationId || null,
    contract_title: String(body.contract_title ?? '').trim() || '',
    contract_number: String(body.contract_number ?? '').trim() || '',
    status,
    contract_type: contractType,
    start_date: toDateOnly(body.start_date),
    end_date: toDateOnly(body.end_date),
    contract_value: String(body.contract_value ?? '').trim() || '',
    scope_summary: String(body.scope_summary ?? '').trim() || '',
    signed_by: String(body.signed_by ?? '').trim() || '',
    signed_date: toDateOnly(body.signed_date),
    file_url: body.file_url ? String(body.file_url).trim() || null : null,
    file_urls: Array.isArray(body.file_urls)
      ? body.file_urls.map((u) => String(u).trim()).filter(Boolean)
      : [],
    notes: String(body.notes ?? '').trim() || '',
    related_proposal_id: body.related_proposal_id ? String(body.related_proposal_id).trim() || null : null,
    related_project_id: body.related_project_id ? String(body.related_project_id).trim() || null : null,
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
    const { data, error } = await supabaseAdmin.from('client_contracts').insert(row).select('id').single();
    if (error) {
      console.error('[create-client-contract]', error);
      return res.status(500).json({ error: 'Failed to create contract' });
    }
    if (row.related_proposal_id) {
      await supabaseAdmin
        .from('client_proposals')
        .update({ linked_contract_id: data.id, updated_at: new Date().toISOString() })
        .eq('id', row.related_proposal_id);
    }
    const fileUrls = Array.isArray(row.file_urls) ? row.file_urls : [];
    if (fileUrls.length > 0) {
      await ensureAttachmentsFromFiles(supabaseAdmin, {
        clientId: row.client_id,
        userId: row.user_id,
        organizationId: row.organization_id,
        fileUrls,
        linkedContractId: data.id,
      });
    }
    return res.status(201).json({ id: data.id, contract: { ...row, id: data.id } });
  } catch (err) {
    console.error('[create-client-contract]', err);
    return res.status(500).json({ error: 'Failed to create contract' });
  }
}
