/**
 * Returns org members with user profile emails (service role so RLS doesn't hide emails).
 * Only org admins (or developers) can list. Used by Team page to show Revoke vs Invite correctly.
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
      return res.status(403).json({ error: 'Only org admins and developers can list members' });
    }

    const { data: members, error } = await supabaseAdmin
      .from('org_members')
      .select(`
        user_id,
        role,
        user:user_profiles(id, email)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[get-org-members]', error);
      return res.status(500).json({ error: 'Failed to load members' });
    }

    return res.status(200).json({ members: members || [] });
  } catch (err) {
    console.error('[get-org-members]', err);
    return res.status(500).json({ error: err.message || 'Failed to load members' });
  }
}
