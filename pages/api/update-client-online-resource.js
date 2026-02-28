/**
 * Updates a client online resource. POST body: { userId, resourceId, organizationId?, ...fields }
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

function parseBody(body, existing) {
  return {
    resource_name: String(body.resource_name ?? existing?.resource_name ?? '').trim() || '',
    url: String(body.url ?? existing?.url ?? '').trim() || '',
    resource_type: body.resource_type !== undefined ? (body.resource_type ? String(body.resource_type).trim() || null : null) : (existing?.resource_type ?? null),
    description: String(body.description ?? existing?.description ?? '').trim() || '',
    login_email_username: body.login_email_username !== undefined ? (body.login_email_username ? String(body.login_email_username).trim() || null : null) : (existing?.login_email_username ?? null),
    access_instructions: String(body.access_instructions ?? existing?.access_instructions ?? '').trim() || '',
    date_added: body.date_added !== undefined ? toDateOnly(body.date_added) : (existing?.date_added ?? null),
    last_verified_date: body.last_verified_date !== undefined ? toDateOnly(body.last_verified_date) : (existing?.last_verified_date ?? null),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { userId, resourceId, organizationId } = req.body || {};
  if (!userId || !resourceId) return res.status(400).json({ error: 'Missing userId or resourceId' });

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_online_resources')
      .select('*')
      .eq('id', resourceId)
      .limit(1)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Online resource not found' });

    if (organizationId) {
      if (existing.organization_id !== organizationId) return res.status(403).json({ error: 'Online resource does not belong to this organization' });
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    } else {
      if (existing.organization_id != null || existing.user_id !== userId) return res.status(403).json({ error: 'Online resource does not belong to you' });
    }

    const updates = parseBody(req.body, existing);
    const { error: updateErr } = await supabaseAdmin.from('client_online_resources').update(updates).eq('id', resourceId);
    if (updateErr) {
      console.error('[update-client-online-resource]', updateErr);
      return res.status(500).json({ error: 'Failed to update online resource' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-online-resource]', err);
    return res.status(500).json({ error: 'Failed to update online resource' });
  }
}
