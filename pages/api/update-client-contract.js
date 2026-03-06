/**
 * Updates a client contract. POST body: { userId, contractId, organizationId?, ...fields }
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

const STATUSES = ['draft', 'active', 'inactive', 'completed', 'abandoned'];
const CONTRACT_TYPES = ['service_agreement', 'retainer_agreement', 'maintenance_agreement', 'nda', 'vendor_agreement'];

function parseBody(body, existing) {
  const status = body.status !== undefined
    ? (STATUSES.includes(String(body.status).toLowerCase()) ? String(body.status).toLowerCase() : (existing?.status ?? 'draft'))
    : (existing?.status ?? 'draft');
  const contractType = body.contract_type !== undefined
    ? (body.contract_type && CONTRACT_TYPES.includes(String(body.contract_type)) ? body.contract_type : null)
    : (existing?.contract_type ?? null);
  return {
    contract_title: String(body.contract_title ?? existing?.contract_title ?? '').trim() || '',
    contract_number: String(body.contract_number ?? existing?.contract_number ?? '').trim() || '',
    status,
    contract_type: contractType,
    start_date: body.start_date !== undefined ? toDateOnly(body.start_date) : (existing?.start_date ?? null),
    end_date: body.end_date !== undefined ? toDateOnly(body.end_date) : (existing?.end_date ?? null),
    contract_value: String(body.contract_value ?? existing?.contract_value ?? '').trim() || '',
    scope_summary: String(body.scope_summary ?? existing?.scope_summary ?? '').trim() || '',
    signed_by: String(body.signed_by ?? existing?.signed_by ?? '').trim() || '',
    signed_date: body.signed_date !== undefined ? toDateOnly(body.signed_date) : (existing?.signed_date ?? null),
    file_url: body.file_url !== undefined ? (body.file_url ? String(body.file_url).trim() || null : null) : (existing?.file_url ?? null),
    file_urls:
      body.file_urls !== undefined
        ? (Array.isArray(body.file_urls) ? body.file_urls.map((u) => String(u).trim()).filter(Boolean) : [])
        : (existing?.file_urls ?? []),
    notes: String(body.notes ?? existing?.notes ?? '').trim() || '',
    related_proposal_id: body.related_proposal_id !== undefined ? (body.related_proposal_id ? String(body.related_proposal_id).trim() || null : null) : (existing?.related_proposal_id ?? null),
    related_project_id: body.related_project_id !== undefined ? (body.related_project_id ? String(body.related_project_id).trim() || null : null) : (existing?.related_project_id ?? null),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { userId, contractId, organizationId } = req.body || {};
  if (!userId || !contractId) return res.status(400).json({ error: 'Missing userId or contractId' });

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_contracts')
      .select('*')
      .eq('id', contractId)
      .limit(1)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Contract not found' });

    if (organizationId) {
      if (existing.organization_id !== organizationId) return res.status(403).json({ error: 'Contract does not belong to this organization' });
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    } else {
      if (existing.organization_id != null || existing.user_id !== userId) return res.status(403).json({ error: 'Contract does not belong to you' });
    }

    const updates = parseBody(req.body, existing);
    const { error: updateErr } = await supabaseAdmin.from('client_contracts').update(updates).eq('id', contractId);
    if (updateErr) {
      console.error('[update-client-contract]', updateErr);
      return res.status(500).json({ error: 'Failed to update contract' });
    }
    const newRelatedProposalId = updates.related_proposal_id || null;
    const oldRelatedProposalId = existing.related_proposal_id || null;
    if (oldRelatedProposalId && oldRelatedProposalId !== newRelatedProposalId) {
      await supabaseAdmin
        .from('client_proposals')
        .update({ linked_contract_id: null, updated_at: new Date().toISOString() })
        .eq('id', oldRelatedProposalId)
        .eq('linked_contract_id', contractId);
    }
    if (newRelatedProposalId) {
      await supabaseAdmin
        .from('client_proposals')
        .update({ linked_contract_id: contractId, updated_at: new Date().toISOString() })
        .eq('id', newRelatedProposalId);
    }
    const fileUrls = Array.isArray(updates.file_urls) ? updates.file_urls : [];
    if (fileUrls.length > 0) {
      await ensureAttachmentsFromFiles(supabaseAdmin, {
        clientId: existing.client_id,
        userId: existing.user_id,
        organizationId: existing.organization_id,
        fileUrls,
        linkedContractId: contractId,
      });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-contract]', err);
    return res.status(500).json({ error: 'Failed to update contract' });
  }
}
