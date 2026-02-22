/**
 * Returns the org's team member access config (which sections are enabled for all team members).
 * Used by team members to know what they can access; used by admin to display current config.
 */

const { createClient } = require('@supabase/supabase-js');
const { DEFAULT_TEAM_MEMBER_SECTIONS } = require('../../config/teamMemberAccess');

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
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (memErr || !membership?.organization_id) {
      return res.status(200).json({ teamMemberSections: DEFAULT_TEAM_MEMBER_SECTIONS });
    }

    const orgId = membership.organization_id;
    const { data: adminRows } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .eq('role', 'admin')
      .limit(1);

    if (!adminRows?.length) {
      return res.status(200).json({ teamMemberSections: DEFAULT_TEAM_MEMBER_SECTIONS });
    }

    const adminUserId = adminRows[0].user_id;
    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('profile')
      .eq('id', adminUserId)
      .single();

    if (profileErr || !profileRow?.profile) {
      return res.status(200).json({ teamMemberSections: DEFAULT_TEAM_MEMBER_SECTIONS });
    }

    const profile = typeof profileRow.profile === 'object' ? profileRow.profile : {};
    const raw = profile.teamMemberSections || {};
    const teamMemberSections = { ...DEFAULT_TEAM_MEMBER_SECTIONS };
    Object.keys(teamMemberSections).forEach((key) => {
      if (raw[key] === true) teamMemberSections[key] = true;
    });

    return res.status(200).json({ teamMemberSections });
  } catch (err) {
    console.error('[get-org-member-access]', err);
    return res.status(500).json({ error: 'Failed to load team member access' });
  }
}
