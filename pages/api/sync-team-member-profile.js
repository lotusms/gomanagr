/**
 * Sync a team member's user_profiles row when an admin updates the member in the Team UI.
 * Only admins/developers of the org can call this. Finds the user in that org by email and
 * updates their profile with the provided team member data.
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
  }
} catch (e) {
  supabaseAdmin = null;
}

const ROW_KEYS = new Set([
  'userId', 'id', 'email', 'firstName', 'lastName', 'purpose', 'role',
  'createdAt', 'updatedAt',
]);

function buildProfileFromTeamMember(data) {
  const profile = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (ROW_KEYS.has(key) || value === undefined) return;
    profile[key] = value;
  });
  return profile;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { organizationId, callerUserId, email, teamMemberData } = req.body;

  if (!organizationId || !callerUserId || !email || !teamMemberData || typeof teamMemberData !== 'object') {
    return res.status(400).json({ error: 'Missing organizationId, callerUserId, email, or teamMemberData' });
  }

  const emailNorm = email.toLowerCase().trim();

  try {
    // Verify caller is admin or developer of this org
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', callerUserId)
      .single();

    if (memberError || !membership || !['superadmin', 'admin', 'developer'].includes(membership.role)) {
      return res.status(403).json({ error: 'Unauthorized: Only admins and developers can sync team member profile' });
    }

    // Find the user in this org with this email (org_members + user_profiles)
    const { data: members, error: listError } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', organizationId);

    if (listError || !members?.length) {
      return res.status(200).json({ ok: true, synced: false, reason: 'no_member_in_org' });
    }

    const userIds = members.map((m) => m.user_id);
    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, profile')
      .in('id', userIds)
      .ilike('email', emailNorm)
      .maybeSingle();

    if (profileError || !profileRow) {
      return res.status(200).json({ ok: true, synced: false, reason: 'no_user_with_email' });
    }

    const existingProfile = (profileRow.profile && typeof profileRow.profile === 'object') ? profileRow.profile : {};
    const teamProfile = buildProfileFromTeamMember(teamMemberData);
    const mergedProfile = { ...existingProfile, ...teamProfile };

    const trim = (v) => (v == null ? '' : String(v).trim());
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        first_name: trim(teamMemberData.firstName ?? teamMemberData.first_name),
        last_name: trim(teamMemberData.lastName ?? teamMemberData.last_name),
        profile: mergedProfile,
        updated_at: now,
      })
      .eq('id', profileRow.id);

    if (updateError) {
      console.error('[sync-team-member-profile]', updateError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    return res.status(200).json({ ok: true, synced: true });
  } catch (err) {
    console.error('[sync-team-member-profile]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
