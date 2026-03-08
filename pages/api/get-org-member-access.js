/**
 * Returns the org's team member access config (which sections are enabled for all team members).
 * Config is stored in the org "config owner" profile: superadmin (owner) if any, else first admin.
 * Used by team members to know what they can access; used by admin/superadmin to display and edit in Settings.
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

/** Resolve the user_id whose profile holds teamMemberSections for this org (superadmin first, else first admin). */
async function getConfigOwnerUserId(supabase, orgId) {
  const { data: ownerRows } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('organization_id', orgId)
    .eq('role', 'superadmin')
    .limit(1);
  if (ownerRows?.length) return ownerRows[0].user_id;
  const { data: adminRows } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('organization_id', orgId)
    .eq('role', 'admin')
    .limit(1);
  return adminRows?.[0]?.user_id ?? null;
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
    const configOwnerId = await getConfigOwnerUserId(supabaseAdmin, orgId);
    if (!configOwnerId) {
      return res.status(200).json({ teamMemberSections: DEFAULT_TEAM_MEMBER_SECTIONS });
    }

    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('profile')
      .eq('id', configOwnerId)
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
