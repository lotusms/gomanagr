/**
 * Toggle current user's org_members.role between superadmin and developer.
 * Only allowed for a specific userId (for testing superadmin vs developer views).
 * POST body: { userId, organizationId }
 */

const { createClient } = require('@supabase/supabase-js');

const ALLOWED_USER_ID_FOR_TOGGLE = 'd5107c55-56d1-480d-9274-30dd2d66665f';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, organizationId } = req.body || {};
  if (!userId || !organizationId) {
    return res.status(400).json({ error: 'Missing userId or organizationId' });
  }

  if (userId !== ALLOWED_USER_ID_FOR_TOGGLE) {
    return res.status(403).json({ error: 'Not allowed to toggle role' });
  }

  try {
    const { data: membership, error: fetchErr } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    const currentRole = membership.role;
    const nextRole =
      currentRole === 'superadmin' ? 'developer' : currentRole === 'developer' ? 'superadmin' : null;

    if (nextRole == null) {
      return res.status(400).json({ error: 'Can only toggle between superadmin and developer' });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('org_members')
      .update({ role: nextRole, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (updateErr) {
      console.error('[toggle-dev-role]', updateErr);
      return res.status(500).json({ error: 'Failed to update role' });
    }

    return res.status(200).json({ ok: true, role: nextRole });
  } catch (err) {
    console.error('[toggle-dev-role]', err);
    return res.status(500).json({ error: err.message || 'Failed to toggle role' });
  }
}
