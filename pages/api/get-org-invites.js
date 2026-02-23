/**
 * Returns pending (unused, not expired) org invites for the organization.
 * Only org admins (or developers) can list invites.
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { organizationId, callerUserId } = req.body || {};
  if (!organizationId || !callerUserId) {
    return res.status(400).json({ error: 'Missing organizationId or callerUserId' });
  }

  try {
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', callerUserId)
      .single();

    if (memErr || !membership || !['superadmin', 'admin', 'developer'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only org admins and developers can list invites' });
    }

    const now = new Date().toISOString();
    const { data: invites, error } = await supabaseAdmin
      .from('org_invites')
      .select('id, email, created_at, expires_at')
      .eq('organization_id', organizationId)
      .eq('used', false)
      .gt('expires_at', now);

    if (error) {
      console.error('[get-org-invites]', error);
      return res.status(500).json({ error: 'Failed to load invites' });
    }

    return res.status(200).json({ invites: invites || [] });
  } catch (err) {
    console.error('[get-org-invites]', err);
    return res.status(500).json({ error: err.message || 'Failed to load invites' });
  }
}
