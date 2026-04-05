import { useState, useMemo, useEffect, useCallback } from 'react';
import { HiChevronLeft, HiChevronRight, HiCalendar } from 'react-icons/hi';
import { buildTimeSlots, parseHour, parseTimeToSlotIndex } from './scheduleTimeUtils';
import { formatTime } from '@/utils/dateTimeFormatters';
import Tooltip from '@/components/ui/Tooltip';
import AppointmentPopover from './AppointmentPopover';

/** YYYY-MM-DD for `date` in `timeZone` (calendar day). */
export function formatYmdInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function weekdayShortInZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timeZone || 'UTC' }).format(date);
}

/**
 * A `Date` on civil day `ymd` in `timeZone` (for formatting weekday/day in that zone).
 * Using UTC-midnight noon for YMD breaks labels near the date line and in some offsets.
 */
export function instantForCivilYmdInZone(ymd, timeZone) {
  const tz = timeZone || 'UTC';
  const [y, m, d] = ymd.split('-').map(Number);
  const lo = Date.UTC(y, m - 1, d, 0, 0, 0) - 36 * 3600000;
  const hi = Date.UTC(y, m - 1, d, 0, 0, 0) + 36 * 3600000;
  for (let ms = lo; ms <= hi; ms += 3600000) {
    const inst = new Date(ms);
    if (formatYmdInTimeZone(inst, tz) === ymd) return inst;
  }
  for (let ms = lo; ms <= hi; ms += 900000) {
    const inst = new Date(ms);
    if (formatYmdInTimeZone(inst, tz) === ymd) return inst;
  }
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function nextCivilDay(ymd, timeZone) {
  const tz = timeZone || 'UTC';
  const start = instantForCivilYmdInZone(ymd, tz);
  for (let ms = start.getTime() + 3600000; ms < start.getTime() + 48 * 3600000; ms += 3600000) {
    const next = formatYmdInTimeZone(new Date(ms), tz);
    if (next !== ymd) return next;
  }
  for (let ms = start.getTime() + 900000; ms < start.getTime() + 48 * 3600000; ms += 900000) {
    const next = formatYmdInTimeZone(new Date(ms), tz);
    if (next !== ymd) return next;
  }
  return ymd;
}

function prevCivilDay(ymd, timeZone) {
  const tz = timeZone || 'UTC';
  const start = instantForCivilYmdInZone(ymd, tz);
  for (let ms = start.getTime() - 3600000; ms > start.getTime() - 48 * 3600000; ms -= 3600000) {
    const prev = formatYmdInTimeZone(new Date(ms), tz);
    if (prev !== ymd) return prev;
  }
  for (let ms = start.getTime() - 900000; ms > start.getTime() - 48 * 3600000; ms -= 900000) {
    const prev = formatYmdInTimeZone(new Date(ms), tz);
    if (prev !== ymd) return prev;
  }
  return ymd;
}

/**
 * Sunday (calendar) of the week containing `now` in `timeZone`, as YYYY-MM-DD.
 * Week is Sun–Sat (US-style).
 */
export function getSundayYmdInTimeZone(timeZone, now = new Date()) {
  const tz = timeZone || 'UTC';
  let ymd = formatYmdInTimeZone(now, tz);
  for (let i = 0; i < 14; i++) {
    const inst = instantForCivilYmdInZone(ymd, tz);
    if (weekdayShortInZone(inst, tz) === 'Sun') return ymd;
    ymd = prevCivilDay(ymd, tz);
  }
  return formatYmdInTimeZone(now, tz);
}

export function addCalendarDaysYmd(ymd, delta, timeZone) {
  const tz = timeZone || 'UTC';
  if (delta === 0) return ymd;
  let current = ymd;
  const step = delta > 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(delta); i++) {
    current = step > 0 ? nextCivilDay(current, tz) : prevCivilDay(current, tz);
  }
  return current;
}

function buildWeekYmds(weekStartYmd, timeZone) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    out.push(addCalendarDaysYmd(weekStartYmd, i, timeZone));
  }
  return out;
}

/**
 * Process appointments for the week view
 * @param {Array} weekYmds - Seven YYYY-MM-DD strings (Sun–Sat) in org timezone
 */
function processAppointmentsForWeek(appointments, weekYmds, startHour, timeZone) {
  if (!appointments || !Array.isArray(appointments)) return [];

  return appointments
    .map((apt) => {
      let appointmentDateKey;
      if (typeof apt.date === 'string') {
        appointmentDateKey = apt.date;
      } else {
        appointmentDateKey = formatYmdInTimeZone(new Date(apt.date), timeZone);
      }

      const dayIndex = weekYmds.findIndex((ymd) => ymd === appointmentDateKey);

      if (dayIndex === -1) return null;

      const startSlot = parseTimeToSlotIndex(apt.start, startHour);
      const endSlot = parseTimeToSlotIndex(apt.end, startHour);

      return {
        ...apt,
        dayIndex,
        startSlot,
        endSlot,
        color: 'bg-primary-100 dark:bg-primary-900/40 border-primary-200 dark:border-primary-600 text-primary-800 dark:text-primary-200',
      };
    })
    .filter(Boolean);
}

export default function Schedule({
  businessHoursStart = '08:00',
  businessHoursEnd = '18:00',
  timeFormat = '24h',
  dateFormat = 'MM/DD/YYYY',
  timezone = 'UTC',
  appointments = [],
  teamMembers = [],
  clients = [],
  services = [],
  onAppointmentClick,
  onAppointmentDelete,
  isTeamMember = false,
  currentUserStaffId = null,
  industry = null,
}) {
  /** When org schedule has no timezone, data layer defaults to UTC — use the browser zone so "today" matches the user's calendar. */
  const rawTz = timezone || 'UTC';
  const [browserIanaZone, setBrowserIanaZone] = useState(null);
  useEffect(() => {
    setBrowserIanaZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  }, []);
  const tz = useMemo(
    () => (rawTz !== 'UTC' ? rawTz : browserIanaZone ?? 'UTC'),
    [rawTz, browserIanaZone]
  );

  const [weekStartYmd, setWeekStartYmd] = useState(() => getSundayYmdInTimeZone(timezone || 'UTC'));
  /** When true, keep the grid on the current calendar week (updates when the week rolls). */
  const [pinnedToLiveWeek, setPinnedToLiveWeek] = useState(true);

  const snapToCurrentWeek = useCallback(() => {
    setWeekStartYmd(getSundayYmdInTimeZone(tz));
  }, [tz]);

  useEffect(() => {
    setWeekStartYmd(getSundayYmdInTimeZone(tz));
  }, [tz]);

  useEffect(() => {
    if (!pinnedToLiveWeek) return undefined;
    const id = setInterval(snapToCurrentWeek, 60 * 1000);
    return () => clearInterval(id);
  }, [pinnedToLiveWeek, snapToCurrentWeek]);

  useEffect(() => {
    if (!pinnedToLiveWeek) return undefined;
    const onVis = () => {
      if (document.visibilityState === 'visible') snapToCurrentWeek();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pinnedToLiveWeek, snapToCurrentWeek]);

  const weekYmds = useMemo(() => buildWeekYmds(weekStartYmd, tz), [weekStartYmd, tz]);

  const todayKey = useMemo(() => formatYmdInTimeZone(new Date(), tz), [tz]);

  const timeSlots = buildTimeSlots(businessHoursStart, businessHoursEnd, timeFormat);
  const startHour = parseHour(businessHoursStart);

  const processedAppointments = useMemo(() => {
    return processAppointmentsForWeek(appointments, weekYmds, startHour, tz);
  }, [appointments, weekYmds, startHour, tz]);

  const monthYearLabel = useMemo(() => {
    const first = instantForCivilYmdInZone(weekYmds[0], tz);
    const last = instantForCivilYmdInZone(weekYmds[6], tz);
    const monthLong = (d) =>
      new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: tz }).format(d);
    const yearNum = (d) =>
      new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: tz }).format(d);
    const m0 = monthLong(first);
    const m1 = monthLong(last);
    const y0 = yearNum(first);
    const y1 = yearNum(last);
    if (m0 === m1 && y0 === y1) return `${m0} ${y0}`;
    if (y0 === y1) return `${m0} – ${m1} ${y0}`;
    return `${m0} ${y0} – ${m1} ${y1}`;
  }, [weekYmds, tz]);

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{monthYearLabel}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setPinnedToLiveWeek(false);
                setWeekStartYmd((m) => addCalendarDaysYmd(m, -7, tz));
              }}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Previous week"
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setPinnedToLiveWeek(true);
                snapToCurrentWeek();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30"
            >
              <HiCalendar className="w-4 h-4" />
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setPinnedToLiveWeek(false);
                setWeekStartYmd((m) => addCalendarDaysYmd(m, 7, tz));
              }}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Next week"
            >
              <HiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="w-14 p-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700" />
                {weekYmds.map((ymd, colIndex) => {
                  const isToday = ymd === todayKey;
                  const labelDate = instantForCivilYmdInZone(ymd, tz);
                  return (
                    <th
                      key={ymd}
                      className={`relative min-w-0 p-2 text-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 ${
                        colIndex > 0 ? 'border-r dark:border-gray-700' : ''
                      } ${isToday ? 'bg-primary-50/50 dark:bg-primary-900/30' : ''}`}
                    >
                      <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        {new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(labelDate)}
                      </span>
                      <span
                        className={`inline-flex items-center justify-center mt-1 w-8 h-8 rounded-full text-sm font-semibold ${
                          isToday ? 'bg-primary-500 text-white ring-2 ring-primary-200 dark:ring-primary-800' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: tz }).format(labelDate)}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, rowIndex) => (
                <tr key={slot}>
                  <td className="w-14 min-w-0 p-1.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 align-center overflow-hidden">
                    <Tooltip content={slot} placement="bottom">
                      <span className="truncate block">{slot}</span>
                    </Tooltip>
                  </td>

                  {weekYmds.map((ymd, colIndex) => {
                    const isToday = ymd === todayKey;
                    const appointment = processedAppointments.find(
                      (a) => a.dayIndex === colIndex && a.startSlot === rowIndex
                    );
                    const covered = processedAppointments.some(
                      (a) => a.dayIndex === colIndex && rowIndex > a.startSlot && rowIndex < a.endSlot
                    );
                    if (covered) return null;
                    if (appointment) {
                      const timeRange = `${formatTime(appointment.start, timeFormat)} – ${formatTime(appointment.end, timeFormat)}`;
                      const displayTitle = (appointment.title || '').trim() || 'Appointment';
                      const isGroup =
                        Array.isArray(appointment.staffIds) && appointment.staffIds.length > 1;
                      const isOwn =
                        currentUserStaffId &&
                        ((Array.isArray(appointment.staffIds) &&
                          appointment.staffIds.some((id) => String(id) === String(currentUserStaffId))) ||
                          String(appointment.staffId) === String(currentUserStaffId));
                      const canEdit = !isTeamMember || (isOwn && !isGroup);
                      const canDelete = !isTeamMember || (isOwn && !isGroup);

                      return (
                        <td
                          key={ymd}
                          rowSpan={appointment.endSlot - appointment.startSlot}
                          className={`relative align-top p-1 min-w-0 overflow-hidden ${appointment.color} dark:bg-primary-900/40 dark:border-primary-600 dark:text-primary-200 border-2 border-primary-600/50 dark:border-primary-500/50 cursor-pointer hover:opacity-80 transition-opacity`}
                        >
                          <AppointmentPopover
                            appointment={appointment}
                            teamMembers={teamMembers}
                            clients={clients}
                            timeFormat={timeFormat}
                            onOpenEdit={onAppointmentClick}
                            onDelete={onAppointmentDelete}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            industry={industry}
                          >
                            <span className="text-xs font-medium truncate block">{displayTitle}</span>
                            <span className="text-xs text-gray-600 dark:text-primary-300 truncate block mt-0.5">
                              {timeRange}
                            </span>
                          </AppointmentPopover>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={ymd}
                        className={`border border-gray-100 dark:border-gray-700 align-top min-w-0 ${
                          isToday ? 'bg-primary-50/30 dark:bg-primary-900/20' : ''
                        }`}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
