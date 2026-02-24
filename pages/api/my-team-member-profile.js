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

    const { data: ownProfile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('id, first_name, last_name, email, profile')
      .eq('id', userId)
      .single();

    const orgId = membership.organization_id;
    const { data: adminRows } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .in('role', ['superadmin', 'admin'])
      .limit(1);

    let member = null;
    let adminUserId = null;

    if (adminRows?.length) {
      const profileOwnerId = adminRows[0].user_id;
      const { data: adminProfile, error: adminErr } = await supabaseAdmin
        .from('user_profiles')
        .select('team_members')
        .eq('id', profileOwnerId)
        .single();

      if (!adminErr && adminProfile?.team_members?.length) {
        const found = (adminProfile.team_members || []).find((m) => {
          if ((m.email || '').trim().toLowerCase() !== emailNorm) return false;
          if (m.userId != null && m.userId !== '') return m.userId === userId;
          return true;
        });
        if (found) {
          member = found;
          adminUserId = profileOwnerId;
        }
      }
    }

    if (!member && !profileErr && ownProfile) {
      const profile = (ownProfile.profile && typeof ownProfile.profile === 'object') ? ownProfile.profile : {};
      const addr = profile.address && typeof profile.address === 'object' ? profile.address : {};
      member = {
        id: ownProfile.id,
        userId: userId,
        firstName: (ownProfile.first_name || profile.firstName || '').trim(),
        lastName: (ownProfile.last_name || profile.lastName || '').trim(),
        email: (ownProfile.email || authUser.user.email || '').trim(),
        role: profile.role ?? '',
        title: profile.title ?? '',
        phone: profile.phone ?? '',
        address: {
          address1: addr.address1 ?? addr.address ?? '',
          address2: addr.address2 ?? '',
          city: addr.city ?? '',
          state: addr.state ?? '',
          postalCode: addr.postalCode ?? '',
          country: addr.country ?? '',
        },
        bio: profile.bio ?? '',
        gender: profile.gender ?? '',
        personalityTraits: Array.isArray(profile.personalityTraits) ? profile.personalityTraits : [],
        yearsExperience: profile.yearsExperience != null ? profile.yearsExperience : '',
        pictureUrl: profile.pictureUrl ?? '',
      };
    }

    if (member && ownProfile) {
      const profile = (ownProfile.profile && typeof ownProfile.profile === 'object') ? ownProfile.profile : {};
      const addr = profile.address && typeof profile.address === 'object' ? profile.address : {};
      const trim = (v) => (v != null && v !== '' ? String(v).trim() : '');
      const fallback = (a, b) => (trim(a) || trim(b) || (typeof a === 'number' ? a : ''));
      member = {
        ...member,
        id: member.id || ownProfile.id,
        userId: member.userId || userId,
        firstName: fallback(member.firstName, ownProfile.first_name || profile.firstName),
        lastName: fallback(member.lastName, ownProfile.last_name || profile.lastName),
        email: fallback(member.email, ownProfile.email || authUser.user.email),
        role: fallback(member.role, profile.role),
        title: fallback(member.title, profile.title),
        phone: fallback(member.phone, profile.phone),
        address: {
          address1: fallback(member.address?.address1, addr.address1 ?? addr.address),
          address2: fallback(member.address?.address2, addr.address2),
          city: fallback(member.address?.city, addr.city),
          state: fallback(member.address?.state, addr.state),
          postalCode: fallback(member.address?.postalCode, addr.postalCode),
          country: fallback(member.address?.country, addr.country),
        },
        bio: fallback(member.bio, profile.bio),
        gender: fallback(member.gender, profile.gender),
        personalityTraits: Array.isArray(member.personalityTraits) && member.personalityTraits.length ? member.personalityTraits : (Array.isArray(profile.personalityTraits) ? profile.personalityTraits : []),
        yearsExperience: (member.yearsExperience != null && member.yearsExperience !== '') ? member.yearsExperience : (profile.yearsExperience != null ? profile.yearsExperience : ''),
        pictureUrl: fallback(member.pictureUrl, profile.pictureUrl),
      };
    }

    return res.status(200).json({
      member: member || null,
      adminUserId: adminUserId || null,
    });
  } catch (err) {
    console.error('[my-team-member-profile]', err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
}
