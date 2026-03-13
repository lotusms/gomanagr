/**
 * Updates the org's task page settings. Only superadmin, admin, or developer can update.
 * Stored in the org "config owner" profile (user_profiles.profile.taskSettings), same place as teamMemberSections.
 * No new table; applies org-wide and syncs across devices.
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
    views: { list: true, calendar: true, gantt: true },
    defaultView: 'board',
    sprintWeeks: 4,
    sprintStartDate: null,
  };
}

function sanitizeTaskSettings(input) {
  const defaults = getDefaultTaskSettings();
  if (!input || typeof input !== 'object') return defaults;
  const columns =
    input.columns && typeof input.columns === 'object'
      ? { ...defaults.columns, ...input.columns }
      : defaults.columns;
  const statusLabels =
    input.statusLabels && typeof input.statusLabels === 'object'
      ? { ...defaults.statusLabels, ...input.statusLabels }
      : defaults.statusLabels;
  const views =
    input.views && typeof input.views === 'object'
      ? { ...defaults.views, ...input.views }
      : defaults.views;
  const defaultView =
    ['list', 'calendar', 'gantt'].includes(input.defaultView)
      ? input.defaultView
      : 'board';
  const sprintWeeks = [2, 3, 4, 5, 6].includes(Number(input.sprintWeeks)) ? Number(input.sprintWeeks) : defaults.sprintWeeks;
  const sprintStartDate = typeof input.sprintStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.sprintStartDate.trim()) ? input.sprintStartDate.trim() : null;
  return { columns, statusLabels, views, defaultView, sprintWeeks, sprintStartDate };
}

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

  const { userId, taskSettings: rawTaskSettings } = req.body || {};
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
      return res.status(403).json({ error: 'Not a member of an organization' });
    }

    if (!['superadmin', 'admin', 'developer'].includes(membership.role)) {
      return res.status(403).json({
        error: 'Only an organization admin or owner can update task settings',
      });
    }

    const orgId = membership.organization_id;
    const configOwnerId = await getConfigOwnerUserId(supabaseAdmin, orgId);
    if (!configOwnerId) {
      return res.status(500).json({
        error: 'No org owner or admin found to store task settings',
      });
    }

    const taskSettings = sanitizeTaskSettings(rawTaskSettings);

    const { data: profileRow, error: fetchErr } = await supabaseAdmin
      .from('user_profiles')
      .select('profile')
      .eq('id', configOwnerId)
      .single();

    if (fetchErr || !profileRow) {
      return res.status(500).json({ error: 'Failed to load profile' });
    }

    const profile =
      typeof profileRow.profile === 'object' ? { ...profileRow.profile } : {};
    profile.taskSettings = taskSettings;

    const { error: updateErr } = await supabaseAdmin
      .from('user_profiles')
      .update({
        profile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', configOwnerId);

    if (updateErr) {
      console.error('[update-org-task-settings]', updateErr);
      return res.status(500).json({ error: 'Failed to save task settings' });
    }

    return res.status(200).json({ ok: true, taskSettings });
  } catch (err) {
    console.error('[update-org-task-settings]', err);
    return res.status(500).json({ error: 'Failed to save task settings' });
  }
}
