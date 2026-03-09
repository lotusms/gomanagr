/**
 * Task page settings (columns, status labels, visible views). Stored per-org in localStorage.
 * Used by admins/superadmins to configure the tasks page for the organization.
 */

import { TASK_STATUSES } from '@/config/taskConstants';

const STORAGE_KEY_PREFIX = 'tasks-settings';

export const DEFAULT_COLUMNS = {
  assignee: true,
  title: true,
  client: true,
  status: true,
  priority: true,
  due_at: true,
};

export const COLUMN_LABELS = {
  assignee: 'Assignee',
  title: 'Title',
  client: 'Client',
  status: 'Status',
  priority: 'Priority',
  due_at: 'Due date',
};

export const DEFAULT_VIEWS = {
  list: true,
  calendar: true,
};

export const DEFAULT_STATUS_LABELS = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s.label])
);

export function getDefaultTaskSettings() {
  return {
    columns: { ...DEFAULT_COLUMNS },
    statusLabels: { ...DEFAULT_STATUS_LABELS },
    views: { ...DEFAULT_VIEWS },
    defaultView: 'board',
  };
}

export function getTaskSettings(orgId) {
  if (!orgId || typeof window === 'undefined') return getDefaultTaskSettings();
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}-${orgId}`);
    if (!raw) return getDefaultTaskSettings();
    const parsed = JSON.parse(raw);
    return {
      columns: { ...DEFAULT_COLUMNS, ...parsed.columns },
      statusLabels: { ...DEFAULT_STATUS_LABELS, ...parsed.statusLabels },
      views: { ...DEFAULT_VIEWS, ...parsed.views },
      defaultView: parsed.defaultView === 'list' || parsed.defaultView === 'calendar' ? parsed.defaultView : 'board',
    };
  } catch {
    return getDefaultTaskSettings();
  }
}

export function saveTaskSettings(orgId, settings) {
  if (!orgId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}-${orgId}`,
      JSON.stringify({
        columns: settings.columns,
        statusLabels: settings.statusLabels,
        views: settings.views,
        defaultView: settings.defaultView,
      })
    );
  } catch (e) {
    console.warn('Failed to save task settings', e);
  }
}
