/**
 * Updates a client project. POST body: { userId, projectId, organizationId?, ...fields }
 */

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

const STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];

function parseBody(body, existing) {
  const status =
    body.status !== undefined
      ? STATUSES.includes(String(body.status).toLowerCase())
        ? String(body.status).toLowerCase()
        : (existing?.status ?? 'planning')
      : (existing?.status ?? 'planning');
  return {
    project_name: String(body.project_name ?? existing?.project_name ?? '').trim() || '',
    status,
    start_date: body.start_date !== undefined ? toDateOnly(body.start_date) : (existing?.start_date ?? null),
    end_date: body.end_date !== undefined ? toDateOnly(body.end_date) : (existing?.end_date ?? null),
    description: String(body.description ?? existing?.description ?? '').trim() || '',
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
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-project]', err);
    return res.status(500).json({ error: 'Failed to update project' });
  }
}
