/**
 * Updates the current user's team member record in the org's team list (admin's profile)
 * and syncs the same data to the team member's user_profiles so admin and member stay in sync.
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

function cleanTeamMember(member) {
  const cleaned = {};
  Object.keys(member).forEach((key) => {
    if (member[key] !== undefined) {
      if (typeof member[key] === 'object' && member[key] !== null && !Array.isArray(member[key])) {
        const cleanedObj = {};
        Object.keys(member[key]).forEach((k) => {
          if (member[key][k] !== undefined) cleanedObj[k] = member[key][k];
        });
        if (Object.keys(cleanedObj).length > 0) cleaned[key] = cleanedObj;
      } else {
        cleaned[key] = member[key];
      }
    }
  });
  return cleaned;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, teamMemberData } = req.body || {};
  if (!userId || !teamMemberData || typeof teamMemberData !== 'object') {
    return res.status(400).json({ error: 'Missing userId or teamMemberData' });
  }

  try {
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authErr || !authUser?.user?.email) {
      return res.status(404).json({ error: 'User not found' });
    }
    const emailNorm = (authUser.user.email || '').trim().toLowerCase();
    if (!emailNorm) {
      return res.status(400).json({ error: 'User has no email' });
    }

    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('id, profile')
      .eq('id', userId)
      .single();

    if (profileErr || !profileRow) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const { data: membership, error: memberErr } = await supabaseAdmin
      .from('org_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (memberErr || !membership?.organization_id) {
      return res.status(403).json({ error: 'Not a member of an organization' });
    }

    const orgId = membership.organization_id;
    const { data: adminRows } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .in('role', ['superadmin', 'admin', 'developer'])
      .limit(1);

    let memberIndex = -1;
    let adminUserId = null;
    let adminProfile = null;

    if (adminRows?.length) {
      adminUserId = adminRows[0].user_id;
      const { data: ap, error: adminErr } = await supabaseAdmin
        .from('user_profiles')
        .select('team_members')
        .eq('id', adminUserId)
        .single();

      if (!adminErr && Array.isArray(ap?.team_members)) {
        adminProfile = ap;
        memberIndex = adminProfile.team_members.findIndex((m) => {
          if ((m.email || '').trim().toLowerCase() !== emailNorm) return false;
          if (m.userId != null && m.userId !== '') return m.userId === userId;
          return true;
        });
      }
    }

    if (memberIndex === -1) {
      const mergedProfile = buildProfileFromTeamMember(teamMemberData);
      const existingProfile = (profileRow?.profile && typeof profileRow.profile === 'object') ? profileRow.profile : {};
      const { error: updateOwnErr } = await supabaseAdmin
        .from('user_profiles')
        .update({
          first_name: (teamMemberData.firstName ?? '').trim() || null,
          last_name: (teamMemberData.lastName ?? '').trim() || null,
          profile: { ...existingProfile, ...mergedProfile },
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateOwnErr) {
        console.error('[update-my-team-member-profile] own profile', updateOwnErr);
        return res.status(500).json({ error: 'Failed to update profile' });
      }
      const updatedMember = {
        id: userId,
        userId,
        firstName: teamMemberData.firstName ?? '',
        lastName: teamMemberData.lastName ?? '',
        email: teamMemberData.email ?? emailNorm,
        role: teamMemberData.role,
        title: teamMemberData.title,
        phone: teamMemberData.phone,
        address: teamMemberData.address,
        bio: teamMemberData.bio,
        gender: teamMemberData.gender,
        personalityTraits: teamMemberData.personalityTraits,
        yearsExperience: teamMemberData.yearsExperience,
        pictureUrl: teamMemberData.pictureUrl,
      };
      return res.status(200).json({ ok: true, member: updatedMember });
    }

    const existing = adminProfile.team_members[memberIndex];
    const updatedMember = cleanTeamMember({
      ...existing,
      name: teamMemberData.name ?? existing.name,
      firstName: teamMemberData.firstName ?? existing.firstName,
      lastName: teamMemberData.lastName ?? existing.lastName,
      role: teamMemberData.role ?? existing.role,
      title: teamMemberData.title ?? existing.title,
      phone: teamMemberData.phone ?? existing.phone,
      email: teamMemberData.email ?? existing.email,
      address: teamMemberData.address ?? existing.address,
      bio: teamMemberData.bio ?? existing.bio,
      gender: teamMemberData.gender ?? existing.gender,
      personalityTraits: teamMemberData.personalityTraits ?? existing.personalityTraits,
      yearsExperience: teamMemberData.yearsExperience ?? existing.yearsExperience,
      pictureUrl: teamMemberData.pictureUrl ?? existing.pictureUrl,
      location: teamMemberData.location ?? existing.location,
      status: existing.status ?? 'active',
      id: existing.id,
      userId: existing.userId,
      invitedAt: existing.invitedAt,
    });

    const nextTeamMembers = [...adminProfile.team_members];
    nextTeamMembers[memberIndex] = updatedMember;

    const { error: updateTeamErr } = await supabaseAdmin
      .from('user_profiles')
      .update({
        team_members: nextTeamMembers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminUserId);

    if (updateTeamErr) {
      console.error('[update-my-team-member-profile]', updateTeamErr);
      return res.status(500).json({ error: 'Failed to update team member' });
    }

    const mergedProfile = buildProfileFromTeamMember(updatedMember);
    const existingProfile = (profileRow?.profile && typeof profileRow.profile === 'object') ? profileRow.profile : {};
    const { error: syncErr } = await supabaseAdmin
      .from('user_profiles')
      .update({
        first_name: (updatedMember.firstName ?? '').trim() || null,
        last_name: (updatedMember.lastName ?? '').trim() || null,
        profile: { ...existingProfile, ...mergedProfile },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (syncErr) {
      console.error('[update-my-team-member-profile] sync to profile', syncErr);
    }

    return res.status(200).json({ ok: true, member: updatedMember });
  } catch (err) {
    console.error('[update-my-team-member-profile]', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}
