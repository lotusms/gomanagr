/**
 * Returns the org's task page settings (columns, status labels, views, default view).
 * Stored in the org "config owner" profile (superadmin or first admin), same as teamMemberSections.
 * Any org member can call; used so everyone sees the same task config and it loads on any device.
 */

const { createClient } = require('@supabase/supabase-js');

const TASK_STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'to_do', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Completed' },
];

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

function getDefaultTaskSettings() {
  const defaultColumns = {
    assignee: true,
    title: true,
    client: true,
    status: true,
    priority: true,
    due_at: true,
  };
  const defaultStatusLabels = Object.fromEntries(
    TASK_STATUSES.map((s) => [s.value, s.label])
  );
  return {
    columns: { ...defaultColumns },
    statusLabels: { ...defaultStatusLabels },
    views: { list: true, calendar: true },
    defaultView: 'board',
  };
}

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
      return res.status(200).json({ taskSettings: getDefaultTaskSettings() });
    }

    const orgId = membership.organization_id;
    const configOwnerId = await getConfigOwnerUserId(supabaseAdmin, orgId);
    if (!configOwnerId) {
      return res.status(200).json({ taskSettings: getDefaultTaskSettings() });
    }

    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('profile')
      .eq('id', configOwnerId)
      .single();

    if (profileErr || !profileRow?.profile) {
      return res.status(200).json({ taskSettings: getDefaultTaskSettings() });
    }

    const profile = typeof profileRow.profile === 'object' ? profileRow.profile : {};
    const raw = profile.taskSettings || {};
    const defaults = getDefaultTaskSettings();
    const taskSettings = {
      columns: { ...defaults.columns, ...(raw.columns && typeof raw.columns === 'object' ? raw.columns : {}) },
      statusLabels: { ...defaults.statusLabels, ...(raw.statusLabels && typeof raw.statusLabels === 'object' ? raw.statusLabels : {}) },
      views: { ...defaults.views, ...(raw.views && typeof raw.views === 'object' ? raw.views : {}) },
      defaultView: raw.defaultView === 'list' || raw.defaultView === 'calendar' ? raw.defaultView : 'board',
    };

    return res.status(200).json({ taskSettings });
  } catch (err) {
    console.error('[get-org-task-settings]', err);
    return res.status(500).json({ error: 'Failed to load task settings' });
  }
}
