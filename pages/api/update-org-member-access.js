/**
 * Updates the org's team member access config (which sections are enabled for all team members).
 * Superadmin (owner) and admin (and developer) can update. Config is stored in the org "config owner"
 * profile: superadmin if any, else first admin (same as get-org-member-access).
 */

const { createClient } = require('@supabase/supabase-js');
const { TEAM_MEMBER_SECTION_KEYS, DEFAULT_TEAM_MEMBER_SECTIONS } = require('../../config/teamMemberAccess');

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

const VALID_KEYS = new Set(TEAM_MEMBER_SECTION_KEYS);

/** Resolve the user_id whose profile holds teamMemberSections (superadmin first, then developer, then admin). */
async function getConfigOwnerUserId(supabase, orgId) {
  const { data: ownerRows } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('organization_id', orgId)
    .eq('role', 'superadmin')
    .limit(1);
  if (ownerRows?.length) return ownerRows[0].user_id;
  const { data: developerRows } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('organization_id', orgId)
    .eq('role', 'developer')
    .limit(1);
  if (developerRows?.length) return developerRows[0].user_id;
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

  const { userId, teamMemberSections } = req.body || {};
  if (!userId || !teamMemberSections || typeof teamMemberSections !== 'object') {
    return res.status(400).json({ error: 'Missing userId or teamMemberSections' });
  }

  try {
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('org_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (memErr || !membership?.organization_id) {
      return res.status(403).json({ error: 'Not a member of an organization' });
    }

    if (!['superadmin', 'admin', 'developer'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only the organization admin or owner can update team member access' });
    }

    const orgId = membership.organization_id;
    const configOwnerId = await getConfigOwnerUserId(supabaseAdmin, orgId);
    if (!configOwnerId) {
      return res.status(500).json({ error: 'No org owner or admin found to store team member access' });
    }

    const sanitized = { ...DEFAULT_TEAM_MEMBER_SECTIONS };
    Object.keys(sanitized).forEach((key) => {
      if (VALID_KEYS.has(key) && teamMemberSections[key] === true) {
        sanitized[key] = true;
      }
    });

    const { data: profileRow, error: fetchErr } = await supabaseAdmin
      .from('user_profiles')
      .select('profile')
      .eq('id', configOwnerId)
      .single();

    if (fetchErr || !profileRow) {
      return res.status(500).json({ error: 'Failed to load profile' });
    }

    const profile = typeof profileRow.profile === 'object' ? { ...profileRow.profile } : {};
    profile.teamMemberSections = sanitized;

    const { error: updateErr } = await supabaseAdmin
      .from('user_profiles')
      .update({
        profile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', configOwnerId);

    if (updateErr) {
      console.error('[update-org-member-access]', updateErr);
      return res.status(500).json({ error: 'Failed to save team member access' });
    }

    return res.status(200).json({ ok: true, teamMemberSections: sanitized });
  } catch (err) {
    console.error('[update-org-member-access]', err);
    return res.status(500).json({ error: 'Failed to save team member access' });
  }
}
