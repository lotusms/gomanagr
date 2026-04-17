/**
 * Helpers + Supabase fetch for org_time_entries (timesheet grid).
 */

/** @param {Date} d */
export function toLocalYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Monday–Sunday week in the user’s local timezone.
 * @param {Date} [anchor=new Date()]
 * @returns {{ weekStart: Date, weekEnd: Date, dayDates: Date[], dayYmds: string[], startYmd: string, endYmd: string }}
 */
export function getMondayWeekRange(anchor = new Date()) {
  const d = new Date(anchor);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
  const dayYmds = dayDates.map((x) => toLocalYmd(x));
  const sunday = dayDates[6];
  return {
    weekStart: monday,
    weekEnd: sunday,
    dayDates,
    dayYmds,
    startYmd: dayYmds[0],
    endYmd: dayYmds[6],
  };
}

function formatLinkedType(raw) {
  if (raw == null || raw === '') return '';
  const s = String(raw).toLowerCase();
  if (s === 'client') return 'Client';
  if (s === 'project') return 'Project';
  if (s === 'task') return 'Task';
  if (s === 'internal') return 'Internal';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Map a DB row to MyTimesheetSection row shape.
 * @param {object} row
 * @param {string[]} dayYmds
 */
export function mapTimeEntryRowToGridEntry(row, dayYmds) {
  const ymd = row.work_date;
  const workDateStr = typeof ymd === 'string' ? ymd.slice(0, 10) : toLocalYmd(new Date(ymd));
  const dayIndex = dayYmds.indexOf(workDateStr);
  if (dayIndex < 0) return null;

  const method = (row.entry_method || 'manual').toLowerCase();
  const methodLabel = method === 'timer' ? 'Timer' : method === 'clock' ? 'Clock' : 'Manual';
  const st = (row.status || 'draft').toLowerCase();
  const statusLabel =
    st === 'submitted'
      ? 'Submitted'
      : st === 'approved'
        ? 'Approved'
        : st === 'rejected'
          ? 'Rejected'
          : 'Draft';

  return {
    id: row.id,
    member: 'You',
    dayIndex,
    hours: Number(row.hours),
    linkedType: formatLinkedType(row.linked_entity_type),
    linkedLabel: (row.linked_label || '').trim(),
    method: methodLabel,
    status: statusLabel,
    billable: row.billable !== false,
    costable: row.costable !== false,
    notes: (row.notes || '').trim(),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ organizationId: string, userId: string, startYmd: string, endYmd: string, dayYmds: string[] }} args
 */
export async function fetchOrgTimeEntriesForWeek(supabase, { organizationId, userId, startYmd, endYmd, dayYmds }) {
  const { data, error } = await supabase
    .from('org_time_entries')
    .select(
      'id, work_date, hours, notes, status, entry_method, billable, costable, linked_entity_type, linked_entity_id, linked_label, created_at'
    )
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .gte('work_date', startYmd)
    .lte('work_date', endYmd)
    .order('work_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  const out = [];
  for (const row of data || []) {
    const mapped = mapTimeEntryRowToGridEntry(row, dayYmds);
    if (mapped) out.push(mapped);
  }
  return out;
}
