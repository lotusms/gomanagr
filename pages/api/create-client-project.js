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

function parseBody(body) {
  const status = STATUSES.includes(String(body.status || '').toLowerCase()) ? String(body.status).toLowerCase() : 'planning';
  return {
    client_id: String(body.clientId ?? ''),
    user_id: body.userId,
    organization_id: body.organizationId || null,
    project_name: String(body.project_name ?? '').trim() || '',
    status,
    start_date: toDateOnly(body.start_date),
    end_date: toDateOnly(body.end_date),
    description: String(body.description ?? '').trim() || '',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });
  const { userId, clientId, organizationId } = req.body || {};
  if (!userId || !clientId) return res.status(400).json({ error: 'Missing userId or clientId' });
  try {
    if (organizationId) {
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    }
    const row = parseBody(req.body);
    if (row.user_id !== userId) return res.status(400).json({ error: 'user_id must match userId' });
    const { data, error } = await supabaseAdmin.from('client_projects').insert(row).select('id').single();
    if (error) {
      console.error('[create-client-project]', error);
      return res.status(500).json({ error: 'Failed to create project' });
    }
    return res.status(201).json({ id: data.id });
  } catch (err) {
    console.error('[create-client-project]', err);
    return res.status(500).json({ error: 'Failed to create project' });
  }
}
