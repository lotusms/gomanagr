/**
 * Weekly work-hour patterns (org_work_shift_patterns): which days / hours each member typically works.
 * Not the appointment-based schedule (see /dashboard/schedule).
 */

/** Monday = 0 … Sunday = 6 */
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** @param {number} weekday */
export function weekdayLabel(weekday) {
  return WEEKDAY_SHORT[weekday] ?? String(weekday);
}

/**
 * JavaScript Date#getDay: Sun=0 … Sat=6 → stored weekday Mon=0 … Sun=6.
 * @param {number} jsDay
 */
export function jsGetDayToDbWeekday(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** @param {string} t "HH:MM:SS" or "HH:MM" */
export function timeToInputValue(t) {
  if (t == null || t === '') return '09:00';
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ organizationId: string, userId: string }} args
 */
export async function fetchWorkShiftsForMember(supabase, { organizationId, userId }) {
  const { data, error } = await supabase
    .from('org_work_shift_patterns')
    .select('id, weekday, start_time, end_time')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ organizationId: string }} args
 */
export async function fetchAllWorkShiftsForOrg(supabase, { organizationId }) {
  const { data, error } = await supabase
    .from('org_work_shift_patterns')
    .select('id, user_id, weekday, start_time, end_time')
    .eq('organization_id', organizationId)
    .order('user_id', { ascending: true })
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Replace all shift rows for one member (admin RLS).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{
 *   organizationId: string,
 *   userId: string,
 *   rows: Array<{ weekday: number, startTime: string, endTime: string }>,
 * }} args
 * startTime/endTime as "HH:MM" (24h)
 */
export async function replaceWorkShiftsForMember(supabase, { organizationId, userId, rows }) {
  const { error: delErr } = await supabase
    .from('org_work_shift_patterns')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId);

  if (delErr) throw delErr;

  const clean = (rows || []).filter((r) => {
    const w = Number(r.weekday);
    return w >= 0 && w <= 6 && r.startTime && r.endTime && r.startTime < r.endTime;
  });

  if (clean.length === 0) return;

  const toPgTime = (hhmm) => {
    const s = String(hhmm || '').trim();
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return '09:00:00';
    const h = String(Number(m[1])).padStart(2, '0');
    const min = String(Number(m[2])).padStart(2, '0');
    return `${h}:${min}:00`;
  };

  const payload = clean.map((r) => ({
    organization_id: organizationId,
    user_id: userId,
    weekday: Number(r.weekday),
    start_time: toPgTime(r.startTime),
    end_time: toPgTime(r.endTime),
  }));

  const { error: insErr } = await supabase.from('org_work_shift_patterns').insert(payload);
  if (insErr) throw insErr;
}
