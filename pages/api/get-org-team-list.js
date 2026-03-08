/**
 * Returns the org's team member list for dropdowns (e.g. "Signed by" on contracts).
 * Any org member can call this (read-only). For full team management, use get-org-team (admin-only).
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

    if (memErr || !membership) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    const { data: orgMemberRows, error: listErr } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', organizationId);

    const userIds = listErr || !orgMemberRows?.length
      ? []
      : [...new Set(orgMemberRows.map((r) => r.user_id).filter(Boolean))];

    let profileById = new Map();
    if (userIds.length > 0) {
      const { data: profiles, error: profileErr } = await supabaseAdmin
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      if (!profileErr && profiles?.length) {
        profiles.forEach((p) => profileById.set(p.id, p));
      }
    }

    // Build list from org_members (use profile when present, else Unknown)
    const seenIds = new Set();
    const teamMembers = userIds.map((uid) => {
      seenIds.add(uid);
      const p = profileById.get(uid);
      if (p) {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || '';
        return {
          id: uid,
          user_id: uid,
          name: name || 'Unknown',
          displayName: name || 'Unknown',
          email: p.email || '',
        };
      }
      return {
        id: uid,
        user_id: uid,
        name: 'Unknown',
        displayName: 'Unknown',
        email: '',
      };
    });

    // Include org owner's team_members so the list matches the Team page (full team, including anyone not yet in org_members)
    const { data: ownerRow } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('role', 'superadmin')
      .limit(1)
      .maybeSingle();

    if (ownerRow?.user_id) {
      const { data: ownerProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('team_members')
        .eq('id', ownerRow.user_id)
        .single();

      const ownerTeam = Array.isArray(ownerProfile?.team_members) ? ownerProfile.team_members : [];
      for (const m of ownerTeam) {
        const uid = m?.userId ?? m?.id;
        if (!uid || seenIds.has(uid)) continue;
        seenIds.add(uid);
        const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim() || (m.name || '').trim() || m.email || '';
        teamMembers.push({
          id: uid,
          user_id: uid,
          name: name || 'Unknown',
          displayName: name || 'Unknown',
          email: m.email || '',
        });
      }
    }

    return res.status(200).json({ teamMembers });
  } catch (err) {
    console.error('[get-org-team-list]', err);
    return res.status(500).json({ error: err.message || 'Failed to load team list' });
  }
}
