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
      .select('id, first_name, last_name, clients, team_members')
      .in('id', orgUserIds);

    if (profilesErr || !profileRows?.length) {
      return res.status(200).json({ clients: [], isOrgAdmin });
    }

    const userIdToName = {};
    const allClients = [];

    for (const row of profileRows) {
      const first = (row.first_name || '').trim();
      const last = (row.last_name || '').trim();
      userIdToName[row.id] = [first, last].filter(Boolean).join(' ') || 'Unknown';
      const teamMembers = Array.isArray(row.team_members) ? row.team_members : [];
      teamMembers.forEach((m) => {
        if (m?.userId && m?.name) userIdToName[m.userId] = m.name;
      });
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
