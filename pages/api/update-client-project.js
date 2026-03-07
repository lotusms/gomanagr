/**
 * Updates a client project. POST body: { userId, projectId, organizationId?, ...fields }
 */

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

const STATUSES = ['draft', 'active', 'inactive', 'on_hold', 'completed', 'abandoned'];

function parseBody(body, existing) {
  const status =
    body.status !== undefined
      ? STATUSES.includes(String(body.status).toLowerCase())
        ? String(body.status).toLowerCase()
        : (existing?.status ?? 'draft')
      : (existing?.status ?? 'draft');
  const clientIdProvided = body.clientId !== undefined && body.clientId !== null;
  const client_id = clientIdProvided && String(body.clientId ?? '').trim()
    ? String(body.clientId).trim()
    : (existing?.client_id ?? '');
  return {
    client_id,
    project_name: String(body.project_name ?? existing?.project_name ?? '').trim() || '',
    project_number: body.project_number !== undefined ? String(body.project_number ?? '').trim() : (existing?.project_number ?? ''),
    status,
    start_date: body.start_date !== undefined ? toDateOnly(body.start_date) : (existing?.start_date ?? null),
    end_date: body.end_date !== undefined ? toDateOnly(body.end_date) : (existing?.end_date ?? null),
    scope_summary: String(body.scope_summary ?? existing?.scope_summary ?? '').trim() || '',
    project_owner: body.project_owner !== undefined ? String(body.project_owner ?? '').trim() || '' : (existing?.project_owner ?? ''),
    related_proposal_id: body.related_proposal_id !== undefined ? (body.related_proposal_id ? String(body.related_proposal_id).trim() || null : null) : (existing?.related_proposal_id ?? null),
    related_contract_id: body.related_contract_id !== undefined ? (body.related_contract_id ? String(body.related_contract_id).trim() || null : null) : (existing?.related_contract_id ?? null),
    notes: body.notes !== undefined ? String(body.notes ?? '').trim() || '' : (existing?.notes ?? ''),
    file_urls: body.file_urls !== undefined ? (Array.isArray(body.file_urls) ? body.file_urls.map((u) => String(u).trim()).filter(Boolean) : []) : (existing?.file_urls ?? []),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { userId, projectId, organizationId } = req.body || {};
  if (!userId || !projectId) return res.status(400).json({ error: 'Missing userId or projectId' });

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_projects')
      .select('*')
      .eq('id', projectId)
      .limit(1)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Project not found' });

    if (organizationId) {
      if (existing.organization_id !== organizationId) return res.status(403).json({ error: 'Project does not belong to this organization' });
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    } else {
      if (existing.organization_id != null || existing.user_id !== userId) return res.status(403).json({ error: 'Project does not belong to you' });
    }

    const updates = parseBody(req.body, existing);
    const { error: updateErr } = await supabaseAdmin.from('client_projects').update(updates).eq('id', projectId);
    if (updateErr) {
      console.error('[update-client-project]', updateErr);
      return res.status(500).json({ error: 'Failed to update project' });
    }
    const fileUrls = Array.isArray(updates.file_urls) ? updates.file_urls : [];
    if (fileUrls.length > 0) {
      const effectiveClientId = updates.client_id ?? existing.client_id;
      await ensureAttachmentsFromFiles(supabaseAdmin, {
        clientId: effectiveClientId,
        userId: existing.user_id,
        organizationId: existing.organization_id,
        fileUrls,
        linkedProjectId: projectId,
      });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-project]', err);
    return res.status(500).json({ error: 'Failed to update project' });
  }
}
