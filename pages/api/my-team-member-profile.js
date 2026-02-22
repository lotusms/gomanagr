/**
 * Returns the current user's team member record from the org's team list (admin's profile).
 * Used by the Team Member Profile page to load their editable profile.
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

  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    // Use Auth (auth.users) email so we match the team member to the actual login identity.
    // user_profiles.email can be wrong if an invite flow overwrote it (e.g. during testing).
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authErr || !authUser?.user?.email) {
      return res.status(404).json({ error: 'User not found' });
    }
    const emailNorm = (authUser.user.email || '').trim().toLowerCase();
    if (!emailNorm) {
      return res.status(200).json({ member: null });
    }

    const { data: membership, error: memberErr } = await supabaseAdmin
      .from('org_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (memberErr || !membership?.organization_id) {
      return res.status(200).json({ member: null });
    }

    const orgId = membership.organization_id;
    const { data: adminRows } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .eq('role', 'admin')
      .limit(1);

    if (!adminRows?.length) {
      return res.status(200).json({ member: null });
    }

    const adminUserId = adminRows[0].user_id;
    const { data: adminProfile, error: adminErr } = await supabaseAdmin
      .from('user_profiles')
      .select('team_members')
      .eq('id', adminUserId)
      .single();

    if (adminErr || !adminProfile?.team_members?.length) {
      return res.status(200).json({ member: null });
    }

    // Match by auth email; if the team member has userId set, it must match the logged-in user
    // so we never return another person's record (e.g. wrong email in auth or duplicate emails).
    const member = (adminProfile.team_members || []).find((m) => {
      if ((m.email || '').trim().toLowerCase() !== emailNorm) return false;
      if (m.userId != null && m.userId !== '') return m.userId === userId;
      return true;
    });

    return res.status(200).json({
      member: member || null,
      adminUserId: member ? adminUserId : null,
    });
  } catch (err) {
    console.error('[my-team-member-profile]', err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
}
