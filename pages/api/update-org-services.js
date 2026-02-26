/**
 * Updates the org owner's services (and optionally team_members when removing assignments).
 * Only org admins (superadmin, admin, developer) can call. Used by Services page when an admin
 * (non-owner) adds, edits, or deletes a service.
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

  const { organizationId, callerUserId, services, teamMembers } = req.body || {};
  if (!organizationId || !callerUserId || !Array.isArray(services)) {
    return res.status(400).json({
      error: 'Missing organizationId, callerUserId, or services array',
    });
  }

  try {
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', callerUserId)
      .single();

    if (memErr || !membership || !['superadmin', 'admin', 'developer'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only org admins can update org services' });
    }

    const { data: ownerRow, error: ownerErr } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('role', 'superadmin')
      .limit(1)
      .maybeSingle();

    if (ownerErr || !ownerRow?.user_id) {
      return res.status(404).json({ error: 'Org owner not found' });
    }

    const updatePayload = {
      services,
      updated_at: new Date().toISOString(),
    };
    if (teamMembers !== undefined && Array.isArray(teamMembers)) {
      updatePayload.team_members = teamMembers;
    }

    const { error: updateErr } = await supabaseAdmin
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', ownerRow.user_id);

    if (updateErr) {
      console.error('[update-org-services]', updateErr);
      return res.status(500).json({ error: 'Failed to update org services' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-org-services]', err);
    return res.status(500).json({ error: err.message || 'Failed to update org services' });
  }
}
