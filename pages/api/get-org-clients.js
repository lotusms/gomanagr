/**
 * Returns the organization's clients for the current user.
 * - Admin: all clients from admin's user_profiles.
 * - Member: only clients where assignedTo includes the member's userId (clients unique to that team member).
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

    const { data: adminRows } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .eq('role', 'admin')
      .limit(1);

    if (!adminRows?.length) {
      return res.status(200).json({ clients: [], isOrgAdmin: false });
    }

    const adminUserId = adminRows[0].user_id;
    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('clients')
      .eq('id', adminUserId)
      .single();

    if (profileErr || !profileRow) {
      return res.status(200).json({ clients: [], isOrgAdmin });
    }

    const allClients = Array.isArray(profileRow.clients) ? profileRow.clients : [];

    if (isOrgAdmin) {
      return res.status(200).json({ clients: allClients, isOrgAdmin: true });
    }

    // Member: only clients assigned to this user (assignedTo includes userId)
    const assignedToMe = (c) => {
      const to = c?.assignedTo;
      if (!Array.isArray(to)) return false;
      return to.includes(userId);
    };
    const filtered = allClients.filter(assignedToMe);

    return res.status(200).json({ clients: filtered, isOrgAdmin: false });
  } catch (err) {
    console.error('[get-org-clients]', err);
    return res.status(500).json({ error: 'Failed to load clients' });
  }
}
