/**
 * Returns the org owner's services and team_members so all org members (admin and regular member)
 * see the same shared services. Callable by any org member.
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

    const { data: ownerRow, error: ownerErr } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('role', 'superadmin')
      .limit(1)
      .maybeSingle();

    if (ownerErr || !ownerRow?.user_id) {
      return res.status(200).json({
        ownerUserId: null,
        services: [],
        teamMembers: [],
      });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('services, team_members')
      .eq('id', ownerRow.user_id)
      .single();

    if (profileErr || !profile) {
      return res.status(200).json({
        ownerUserId: ownerRow.user_id,
        services: [],
        teamMembers: [],
      });
    }

    const services = Array.isArray(profile.services) ? profile.services : [];
    const teamMembers = Array.isArray(profile.team_members) ? profile.team_members : [];

    return res.status(200).json({
      ownerUserId: ownerRow.user_id,
      services,
      teamMembers,
    });
  } catch (err) {
    console.error('[get-org-services]', err);
    return res.status(500).json({ error: err.message || 'Failed to load org services' });
  }
}
