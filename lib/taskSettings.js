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
  gantt: true,
};

export const DEFAULT_STATUS_LABELS = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s.label])
);

export const SPRINT_WEEKS_OPTIONS = [2, 3, 4, 5, 6];
export const DEFAULT_SPRINT_WEEKS = 4;

/** Parse YYYY-MM-DD as UTC midnight (ms). */
function parseDateUTC(ymd) {
  if (!ymd || typeof ymd !== 'string') return null;
  const m = String(ymd).trim().slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

/** Previous Monday 00:00 UTC. */
function getSprintMonday(ts) {
  const d = new Date(ts);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function getSprintRangeStartFromAnchor(anchorMs, nowMs, periodMs) {
  const elapsed = nowMs - anchorMs;
  const periods = Math.floor(elapsed / periodMs);
  const offset = periods < 0 ? 0 : periods * periodMs;
  return anchorMs + offset;
}

/**
 * Current sprint end date (last day of current sprint) as YYYY-MM-DD.
 * Uses sprintStartDate + sprintWeeks from Sprint config, or this week's Monday + sprintWeeks.
 */
export function getCurrentSprintEndDate(sprintStartDate, sprintWeeks) {
  const weeks = Math.max(2, Math.min(6, parseInt(sprintWeeks, 10) || 4));
  const dayMs = 24 * 60 * 60 * 1000;
  const periodMs = weeks * 7 * dayMs;
  const now = Date.now();
  let rangeStart;
  const anchor = parseDateUTC(sprintStartDate);
  if (anchor != null && !Number.isNaN(anchor)) {
    rangeStart = getSprintRangeStartFromAnchor(anchor, now, periodMs);
  } else {
    rangeStart = getSprintMonday(now);
  }
  const lastDayMs = rangeStart + (weeks * 7 - 1) * dayMs;
  const d = new Date(lastDayMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDefaultTaskSettings() {
  return {
    columns: { ...DEFAULT_COLUMNS },
    statusLabels: { ...DEFAULT_STATUS_LABELS },
    views: { ...DEFAULT_VIEWS },
    defaultView: 'board',
    sprintWeeks: DEFAULT_SPRINT_WEEKS,
    sprintStartDate: null,
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
      defaultView: ['list', 'calendar', 'gantt'].includes(parsed.defaultView) ? parsed.defaultView : 'board',
      sprintWeeks: SPRINT_WEEKS_OPTIONS.includes(Number(parsed.sprintWeeks)) ? Number(parsed.sprintWeeks) : DEFAULT_SPRINT_WEEKS,
      sprintStartDate: typeof parsed.sprintStartDate === 'string' && parsed.sprintStartDate.trim() ? parsed.sprintStartDate.trim() : null,
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
        sprintWeeks: settings.sprintWeeks,
        sprintStartDate: settings.sprintStartDate || null,
      })
    );
  } catch (e) {
    console.warn('Failed to save task settings', e);
  }
}
