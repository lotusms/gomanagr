/**
 * Updates a client proposal. POST body: { userId, proposalId, organizationId?, ...fields }
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

const STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];

function parseBody(body, existing) {
  const status = body.status !== undefined
    ? (STATUSES.includes(String(body.status).toLowerCase()) ? String(body.status).toLowerCase() : (existing?.status ?? 'draft'))
    : (existing?.status ?? 'draft');
  return {
    proposal_title: String(body.proposal_title ?? existing?.proposal_title ?? '').trim() || '',
    proposal_number: String(body.proposal_number ?? existing?.proposal_number ?? '').trim() || '',
    date_created: body.date_created !== undefined ? toDateOnly(body.date_created) : (existing?.date_created ?? null),
    date_sent: body.date_sent !== undefined ? toDateOnly(body.date_sent) : (existing?.date_sent ?? null),
    expiration_date: body.expiration_date !== undefined ? toDateOnly(body.expiration_date) : (existing?.expiration_date ?? null),
    status,
    estimated_value: String(body.estimated_value ?? existing?.estimated_value ?? '').trim() || '',
    scope_summary: String(body.scope_summary ?? existing?.scope_summary ?? '').trim() || '',
    included_services_products: String(body.included_services_products ?? existing?.included_services_products ?? '').trim() || '',
    terms: String(body.terms ?? existing?.terms ?? '').trim() || '',
    linked_project: body.linked_project !== undefined ? (body.linked_project ? String(body.linked_project).trim() || null : null) : (existing?.linked_project ?? null),
    linked_contract_id: body.linked_contract_id !== undefined ? body.linked_contract_id || null : (existing?.linked_contract_id ?? null),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { userId, proposalId, organizationId } = req.body || {};
  if (!userId || !proposalId) return res.status(400).json({ error: 'Missing userId or proposalId' });

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_proposals')
      .select('*')
      .eq('id', proposalId)
      .limit(1)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Proposal not found' });

    if (organizationId) {
      if (existing.organization_id !== organizationId) return res.status(403).json({ error: 'Proposal does not belong to this organization' });
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    } else {
      if (existing.organization_id != null || existing.user_id !== userId) return res.status(403).json({ error: 'Proposal does not belong to you' });
    }

    const updates = parseBody(req.body, existing);
    if (req.body?.file_urls !== undefined) {
      updates.file_urls = Array.isArray(req.body.file_urls)
        ? req.body.file_urls.map((u) => String(u).trim()).filter(Boolean)
        : [];
      updates.file_url = updates.file_urls.length > 0 ? updates.file_urls[0] : null;
    }
    const { error: updateErr } = await supabaseAdmin.from('client_proposals').update(updates).eq('id', proposalId);
    if (updateErr) {
      console.error('[update-client-proposal]', updateErr);
      return res.status(500).json({ error: 'Failed to update proposal' });
    }
    const newLinkedContractId = updates.linked_contract_id || null;
    const oldLinkedContractId = existing.linked_contract_id || null;
    if (oldLinkedContractId && oldLinkedContractId !== newLinkedContractId) {
      await supabaseAdmin
        .from('client_contracts')
        .update({ related_proposal_id: null, updated_at: new Date().toISOString() })
        .eq('id', oldLinkedContractId)
        .eq('related_proposal_id', proposalId);
    }
    if (newLinkedContractId) {
      await supabaseAdmin
        .from('client_contracts')
        .update({ related_proposal_id: proposalId, updated_at: new Date().toISOString() })
        .eq('id', newLinkedContractId);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-proposal]', err);
    return res.status(500).json({ error: 'Failed to update proposal' });
  }
}
