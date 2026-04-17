/**
 * Returns org members with user profile (email, names, profile JSON) plus displayName and photoUrl
 * (from team_members on the owner profile when linked, else profile JSON).
 * Service role so RLS doesn't hide data. Only org admins (or developers) can list.
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

function trimTeamMemberPhoto(m) {
  return (m?.pictureUrl || m?.photoUrl || '').trim();
}

function photoFromProfileJson(profile) {
  if (!profile || typeof profile !== 'object') return '';
  const v = profile.photoUrl || profile.pictureUrl || profile.avatarUrl || profile.avatar;
  return v ? String(v).trim() : '';
}

function buildPhotoMapFromOwnerTeam(teamMembers) {
  const map = new Map();
  if (!Array.isArray(teamMembers)) return map;
  for (const m of teamMembers) {
    const uid = m?.userId ?? m?.id;
    const photo = trimTeamMemberPhoto(m);
    if (uid && photo) map.set(String(uid), photo);
  }
  return map;
}

function formatMemberDisplayName(user) {
  const parts = [user?.first_name, user?.last_name]
    .filter((x) => x != null && String(x).trim() !== '')
    .map((x) => String(x).trim());
  if (parts.length) return parts.join(' ');
  return (user?.email || '').trim();
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
        user:user_profiles(id, email, first_name, last_name, profile)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[get-org-members]', error);
      return res.status(500).json({ error: 'Failed to load members' });
    }

    const list = members || [];

    const ownerUserId =
      list.find((m) => m.role === 'superadmin')?.user_id ||
      list.find((m) => m.role === 'developer')?.user_id ||
      list.find((m) => m.role === 'admin')?.user_id ||
      null;

    let photoByUserId = new Map();
    if (ownerUserId) {
      const { data: ownerProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('team_members')
        .eq('id', ownerUserId)
        .maybeSingle();
      photoByUserId = buildPhotoMapFromOwnerTeam(ownerProfile?.team_members);
    }

    const enriched = list.map((m) => {
      const user = m.user;
      const fromTeam = photoByUserId.get(String(m.user_id)) || '';
      const fromProfile = photoFromProfileJson(user?.profile);
      const displayName =
        formatMemberDisplayName(user) || user?.email?.trim() || String(m.user_id).slice(0, 8) || 'Member';
      return {
        ...m,
        displayName,
        photoUrl: fromTeam || fromProfile || '',
      };
    });

    return res.status(200).json({ members: enriched });
  } catch (err) {
    console.error('[get-org-members]', err);
    return res.status(500).json({ error: err.message || 'Failed to load members' });
  }
}
