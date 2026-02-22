/**
 * Returns the organization's schedule data (from an admin's profile) for use on the
 * team member dashboard. Uses service role so team members can read schedule data
 * despite RLS on user_profiles. The client filters to only the current user's
 * appointments (team member sees only their own; admin dashboard shows all).
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

function schedulePayloadFromProfile(userRow) {
  if (!userRow) return null;
  const profile = userRow.profile && typeof userRow.profile === 'object' ? userRow.profile : {};
  return {
    teamMembers: userRow.team_members ?? [],
    appointments: userRow.appointments ?? [],
    clients: userRow.clients ?? [],
    services: userRow.services ?? [],
    businessHoursStart: profile.businessHoursStart ?? '08:00',
    businessHoursEnd: profile.businessHoursEnd ?? '18:00',
    timeFormat: profile.timeFormat ?? '24h',
    dateFormat: profile.dateFormat ?? 'MM/DD/YYYY',
    timezone: profile.timezone ?? 'UTC',
  };
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
    // Ensure caller is a member of an org
    const { data: myMembership, error: myErr } = await supabaseAdmin
      .from('org_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (myErr || !myMembership?.organization_id) {
      return res.status(200).json({ schedule: null });
    }

    const orgId = myMembership.organization_id;

    // Find an admin in this org (to read their profile for schedule data)
    const { data: adminRows, error: adminErr } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .eq('role', 'admin')
      .limit(1);

    if (adminErr || !adminRows?.length) {
      return res.status(200).json({ schedule: null });
    }

    const adminUserId = adminRows[0].user_id;

    // Fetch admin's profile (service role bypasses RLS)
    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('team_members, appointments, clients, services, profile')
      .eq('id', adminUserId)
      .single();

    if (profileErr || !profileRow) {
      return res.status(200).json({ schedule: null });
    }

    const schedule = schedulePayloadFromProfile(profileRow);
    return res.status(200).json({ schedule });
  } catch (err) {
    console.error('[org-schedule-data]', err);
    return res.status(500).json({ error: 'Failed to load schedule data' });
  }
}
