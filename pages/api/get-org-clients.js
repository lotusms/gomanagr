/**
 * Returns the organization's clients for the current user.
 * All org users (admin and members) see all clients from the org.
 * Clients are enriched with addedByName (team member who added the client) for display.
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
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('org_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (memErr || !membership?.organization_id) {
      return res.status(200).json({ clients: [], isOrgAdmin: false });
    }

    const orgId = membership.organization_id;
    const isOrgAdmin = ['superadmin', 'admin', 'developer'].includes(membership.role);

    const { data: orgMemberRows, error: orgMemErr } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', orgId);

    if (orgMemErr || !orgMemberRows?.length) {
      return res.status(200).json({ clients: [], isOrgAdmin });
    }

    const orgUserIds = orgMemberRows.map((r) => r.user_id).filter(Boolean);
    const { data: profileRows, error: profilesErr } = await supabaseAdmin
      .from('user_profiles')
      .select('id, first_name, last_name, email, clients, team_members')
      .in('id', orgUserIds);

    if (profilesErr || !profileRows?.length) {
      return res.status(200).json({ clients: [], isOrgAdmin });
    }

    /** Best display string from a team_members[] entry (prefers first+last / name over raw email). */
    function nameFromTeamMemberEntry(m) {
      if (!m) return '';
      const fl = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
      if (fl) return fl;
      const n = (m.name || '').trim();
      if (n) return n;
      return (m.email || '').trim();
    }

    // 1) Collect name hints from every org profile's team_members (roster often has "First Last" when user_profiles names are empty).
    const teamHintByUserId = {};
    for (const row of profileRows) {
      const teamMembers = Array.isArray(row.team_members) ? row.team_members : [];
      for (const m of teamMembers) {
        const uid = m?.userId;
        if (!uid) continue;
        const nm = nameFromTeamMemberEntry(m);
        if (!nm) continue;
        const prev = teamHintByUserId[uid];
        const prevLooksEmail = prev?.includes('@');
        const nmLooksEmail = nm.includes('@');
        if (!prev || (prevLooksEmail && !nmLooksEmail)) {
          teamHintByUserId[uid] = nm;
        }
      }
    }

    // 2) Resolve each org member: profile first+last, else team roster, else email.
    const userIdToName = {};
    for (const row of profileRows) {
      const first = (row.first_name || '').trim();
      const last = (row.last_name || '').trim();
      const fromProfile = [first, last].filter(Boolean).join(' ').trim();
      const email = (row.email || '').trim();
      const hint = teamHintByUserId[row.id] || '';
      userIdToName[row.id] = fromProfile || hint || email || 'Unknown';
    }

    /** Supabase Auth user_metadata keys used elsewhere in the app (userService, sign-up). */
    function displayNameFromAuthMetadata(meta) {
      if (!meta || typeof meta !== 'object') return '';
      const snake = [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim();
      if (snake) return snake;
      const camel = [meta.firstName, meta.lastName].filter(Boolean).join(' ').trim();
      if (camel) return camel;
      for (const k of ['full_name', 'name', 'display_name']) {
        const v = meta[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      return '';
    }

    // 3) When still unknown or email-only, fill from Auth user_metadata (e.g. OAuth full_name).
    const needsAuthName = orgUserIds.filter((uid) => {
      const v = userIdToName[uid];
      return !v || v === 'Unknown' || (typeof v === 'string' && v.includes('@'));
    });
    await Promise.all(
      needsAuthName.map(async (uid) => {
        try {
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (error || !data?.user) return;
          const fromMeta = displayNameFromAuthMetadata(data.user.user_metadata);
          if (!fromMeta) return;
          userIdToName[uid] = fromMeta;
        } catch (_) {
          /* ignore */
        }
      })
    );

    const allClients = [];
    for (const row of profileRows) {
      const rowClients = Array.isArray(row.clients) ? row.clients : [];
      rowClients.forEach((c) => {
        const addedBy = c?.addedBy || row.id;
        allClients.push({ ...c, addedBy });
      });
    }

    const enrich = (c) => {
      const addedByUserId = c?.addedBy || (Array.isArray(c?.assignedTo) && c.assignedTo[0]) || null;
      const addedByName = addedByUserId ? (userIdToName[addedByUserId] || null) : null;
      return { ...c, addedByName: addedByName || undefined };
    };
    const clients = allClients.map(enrich);

    return res.status(200).json({ clients, isOrgAdmin });
  } catch (err) {
    console.error('[get-org-clients]', err);
    return res.status(500).json({ error: 'Failed to load clients' });
  }
}
