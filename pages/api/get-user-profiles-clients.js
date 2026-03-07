/**
 * Debug: returns user_profiles rows with id and clients array (for console logging structure).
 * POST body: { userId }
 * If user is in an org, returns all org members' profiles (id, email, clients). Otherwise returns current user's profile only.
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin;

try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
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
    const { data: membership } = await supabaseAdmin
      .from('org_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    let userIds = [userId];
    if (membership?.organization_id) {
      const { data: orgMembers } = await supabaseAdmin
        .from('org_members')
        .select('user_id')
        .eq('organization_id', membership.organization_id);
      if (orgMembers?.length) {
        userIds = orgMembers.map((r) => r.user_id).filter(Boolean);
      }
    }

    const { data: profiles, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, clients')
      .in('id', userIds);

    if (error) {
      console.error('[get-user-profiles-clients]', error);
      return res.status(500).json({ error: 'Failed to load profiles' });
    }

    return res.status(200).json({ profiles: profiles || [] });
  } catch (err) {
    console.error('[get-user-profiles-clients]', err);
    return res.status(500).json({ error: 'Failed to load profiles' });
  }
}
