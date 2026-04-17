'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { HiCalendar, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import Avatar from '@/components/ui/Avatar';
import Tooltip from '@/components/ui/Tooltip';
import { buildTimeSlots, parseHour, parseTimeToSlotIndex } from '@/components/dashboard/scheduleTimeUtils';
import { jsGetDayToDbWeekday, timeToInputValue } from '@/lib/orgWorkShiftPatterns';
import { formatTime } from '@/utils/dateTimeFormatters';
import WorkShiftAllocationPopover, {
  buildWeeklyHoursLines,
} from '@/components/timesheets/WorkShiftAllocationPopover';

function toYmd(year, month0, day) {
  return `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Minimum px width per timeline column before horizontal scroll (many slots × narrow viewports). */
const MIN_SLOT_PX = 12;

/** Timeline uses one column per hour (shift bars can still span fractional hours). */
const SLOT_INCREMENT_MINUTES = 60;

/**
 * Stable palette index from user id (no hardcoded per-user map; consistent across renders).
 * @param {string} userId
 * @param {number} paletteLen
 */
function paletteIndexForUserId(userId, paletteLen) {
  const s = String(userId || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % paletteLen;
}

/**
 * Distinct bar + time accent colors (light + dark). Border/bg tuned for thin allocation pills.
 */
const MEMBER_BAR_PALETTES = [
  {
    bar: 'border-sky-300/90 dark:border-sky-600 bg-sky-100/95 dark:bg-sky-900/40',
    time: 'text-sky-900 dark:text-sky-100',
  },
  {
    bar: 'border-cyan-300/90 dark:border-cyan-600 bg-cyan-100/95 dark:bg-cyan-900/40',
    time: 'text-cyan-900 dark:text-cyan-100',
  },
  {
    bar: 'border-teal-300/90 dark:border-teal-600 bg-teal-100/95 dark:bg-teal-900/40',
    time: 'text-teal-900 dark:text-teal-100',
  },
  {
    bar: 'border-emerald-300/90 dark:border-emerald-600 bg-emerald-100/95 dark:bg-emerald-900/40',
    time: 'text-emerald-900 dark:text-emerald-100',
  },
  {
    bar: 'border-lime-300/90 dark:border-lime-600 bg-lime-100/95 dark:bg-lime-900/40',
    time: 'text-lime-900 dark:text-lime-100',
  },
  {
    bar: 'border-amber-300/90 dark:border-amber-600 bg-amber-100/95 dark:bg-amber-900/40',
    time: 'text-amber-950 dark:text-amber-100',
  },
  {
    bar: 'border-orange-300/90 dark:border-orange-600 bg-orange-100/95 dark:bg-orange-900/40',
    time: 'text-orange-950 dark:text-orange-100',
  },
  {
    bar: 'border-rose-300/90 dark:border-rose-600 bg-rose-100/95 dark:bg-rose-900/40',
    time: 'text-rose-900 dark:text-rose-100',
  },
  {
    bar: 'border-fuchsia-300/90 dark:border-fuchsia-600 bg-fuchsia-100/95 dark:bg-fuchsia-900/40',
    time: 'text-fuchsia-900 dark:text-fuchsia-100',
  },
  {
    bar: 'border-violet-300/90 dark:border-violet-600 bg-violet-100/95 dark:bg-violet-900/40',
    time: 'text-violet-900 dark:text-violet-100',
  },
  {
    bar: 'border-indigo-300/90 dark:border-indigo-600 bg-indigo-100/95 dark:bg-indigo-900/40',
    time: 'text-indigo-900 dark:text-indigo-100',
  },
  {
    bar: 'border-blue-300/90 dark:border-blue-600 bg-blue-100/95 dark:bg-blue-900/40',
    time: 'text-blue-900 dark:text-blue-100',
  },
];

function memberBarPalette(userId) {
  const i = paletteIndexForUserId(userId, MEMBER_BAR_PALETTES.length);
  return MEMBER_BAR_PALETTES[i];
}

/** Match `TaskCalendar`: weekday header + fixed-height bar strip per week. */
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MG_THIN_BAR = 16;
const MG_ROW_GAP = 1;
const MG_MAX_BARS = 3;
const MG_MORE_H = 8;
const MG_BAR_STRIP_H =
  MG_MAX_BARS * MG_THIN_BAR + (MG_MAX_BARS - 1) * MG_ROW_GAP + MG_ROW_GAP + MG_MORE_H;

/**
 * Greedy lane assignment for overlapping blocks in one day.
 * @param {Array<{ startSlot: number, endSlot: number, lane?: number }>} blocks
 * @returns {number} maxLanes
 */
function assignLanes(blocks) {
  if (blocks.length === 0) return 1;
  const sorted = [...blocks].sort((a, b) => a.startSlot - b.startSlot || b.endSlot - a.endSlot);
  const laneEndSlot = [];
  for (const b of sorted) {
    let lane = 0;
    while (lane < laneEndSlot.length && laneEndSlot[lane] > b.startSlot) lane++;
    b.lane = lane;
    if (lane === laneEndSlot.length) laneEndSlot.push(b.endSlot);
    else laneEndSlot[lane] = b.endSlot;
  }
  return Math.max(1, laneEndSlot.length);
}

/** Blocks per lane index (0 … maxLanes-1), for stacked rows sized by line-height. */
function blocksGroupedByLane(blocks, maxLanes) {
  const out = Array.from({ length: maxLanes }, () => []);
  for (const b of blocks) {
    const lane = Math.min(b.lane, maxLanes - 1);
    out[lane].push(b);
  }
  return out;
}

/**
 * Month grid: time across the top (fluid width), days down the side.
 * Timeline columns grow to fill the viewport; scroll horizontally only if min slot width would be violated.
 *
 * @param {{
 *   year: number,
 *   month: number,
 *   onPrev: () => void,
 *   onNext: () => void,
 *   onToday: () => void,
 *   shifts: Array<{ user_id: string, weekday: number, start_time: string, end_time: string }>,
 *   resolveMember: (userId: string) => { label: string, photoUrl?: string, email?: string, role?: string },
 *   getEditMemberScheduleHref?: (userId: string) => string | undefined,
 *   teamColumnLabel?: string,
 *   timeFormat?: '12h' | '24h',
 *   variant?: 'timeline' | 'monthGrid',
 * }} props
 */
export default function WorkHoursCalendarGrid({
  year,
  month,
  onPrev,
  onNext,
  onToday,
  shifts = [],
  resolveMember,
  getEditMemberScheduleHref,
  teamColumnLabel = 'Team',
  timeFormat = '12h',
  variant = 'timeline',
}) {
  const { timeSlots, monthDays } = useMemo(() => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    let lo = 8;
    let hi = 18;
    for (const s of shifts) {
      const a = parseHour(timeToInputValue(s.start_time));
      const b = parseHour(timeToInputValue(s.end_time));
      if (a < lo) lo = a;
      if (b > hi) hi = b;
    }
    lo = Math.max(0, lo - 1);
    hi = Math.min(23, hi + 1);
    const businessStart = `${String(lo).padStart(2, '0')}:00`;
    const businessEnd = `${String(hi).padStart(2, '0')}:00`;
    const startHourNum = parseHour(businessStart);
    const slots = buildTimeSlots(businessStart, businessEnd, timeFormat, SLOT_INCREMENT_MINUTES);

    const days = [];
    for (let d = 1; d <= lastDay; d++) {
      const inst = new Date(year, month, d);
      const ymd = toYmd(year, month, d);
      const dbWd = jsGetDayToDbWeekday(inst.getDay());

      const raw = shifts.filter((s) => Number(s.weekday) === dbWd);
      const blocks = raw.map((s) => {
        const resolved = resolveMember(s.user_id);
        const label = resolved.label;
        const photoUrl = resolved.photoUrl || '';
        const email = resolved.email || '';
        const role = resolved.role || '';
        const start = timeToInputValue(s.start_time);
        const end = timeToInputValue(s.end_time);
        let startSlot = parseTimeToSlotIndex(start, startHourNum, SLOT_INCREMENT_MINUTES);
        let endSlot = parseTimeToSlotIndex(end, startHourNum, SLOT_INCREMENT_MINUTES);
        if (endSlot <= startSlot) endSlot = startSlot + 1;
        startSlot = Math.max(0, Math.min(slots.length - 1, startSlot));
        endSlot = Math.max(startSlot + 1, Math.min(slots.length, endSlot));
        const rangeText = `${formatTime(start, timeFormat)} – ${formatTime(end, timeFormat)}`;
        return {
          rowKey: `${s.user_id}-${start}-${end}`,
          userId: s.user_id,
          label,
          photoUrl,
          email,
          role,
          startSlot,
          endSlot,
          rangeText,
          lane: 0,
        };
      });

      const maxLanes = assignLanes(blocks);
      blocks.sort((a, b) => a.startSlot - b.startSlot || a.lane - b.lane || a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

      days.push({
        ymd,
        dayNum: d,
        inst,
        blocks,
        maxLanes,
      });
    }

    return { timeSlots: slots, monthDays: days };
  }, [year, month, shifts, resolveMember, timeFormat]);

  const weeklyLinesByUser = useMemo(() => {
    const m = new Map();
    for (const s of shifts) {
      if (!m.has(s.user_id)) {
        m.set(s.user_id, buildWeeklyHoursLines(shifts, s.user_id, timeFormat));
      }
    }
    return m;
  }, [shifts, timeFormat]);

  const { startPad, daysInMonth, rowCount } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const sp = firstDay.getDay();
    const dim = lastDay.getDate();
    return { startPad: sp, daysInMonth: dim, rowCount: Math.ceil((sp + dim) / 7) };
  }, [year, month]);

  const dayByYmd = useMemo(() => {
    const m = new Map();
    for (const d of monthDays) m.set(d.ymd, d);
    return m;
  }, [monthDays]);

  const now = new Date();
  const todayKey = toYmd(now.getFullYear(), now.getMonth(), now.getDate());

  const monthTitle = new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const slotCount = timeSlots.length;
  const gridTemplateColumns =
    slotCount > 0 ? `repeat(${slotCount}, minmax(${MIN_SLOT_PX}px, 1fr))` : 'none';
  const dayLabelW = 44;
  const headerRowH = 40;
  const timelineMinWidth = slotCount * MIN_SLOT_PX;

  const blockRangeText = (block) => block.rangeText || '';

  if (variant === 'monthGrid') {
    const dayNumFor = (r, c) => {
      const cellIndex = r * 7 + c;
      if (cellIndex < startPad) return null;
      const day = cellIndex - startPad + 1;
      return day <= daysInMonth ? day : null;
    };

    return (
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
        role="region"
        aria-label={`${teamColumnLabel} monthly work hours`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{monthTitle}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Previous month"
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30"
            >
              <HiCalendar className="w-4 h-4" />
              Today
            </button>
            <button
              type="button"
              onClick={onNext}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Next month"
            >
              <HiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse min-w-[600px]">
            <thead>
              <tr>
                {WEEKDAY_LABELS.map((label) => (
                  <th
                    key={label}
                    className="min-w-0 p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }, (_, r) => (
                <tr key={r}>
                  <td colSpan={7} className="align-top p-0 border-b border-gray-100 dark:border-gray-700">
                    <div
                      className="grid w-full border-b border-gray-100 dark:border-gray-700"
                      style={{
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gridTemplateRows: `auto ${MG_BAR_STRIP_H}px`,
                        rowGap: `${MG_ROW_GAP}px`,
                      }}
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((c) => {
                        const day = dayNumFor(r, c);
                        const key =
                          day != null
                            ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                            : `pad-${r}-${c}`;
                        const isToday = day != null && key === todayKey;
                        const isEmpty = day == null;
                        return (
                          <div
                            key={`d-${r}-${c}`}
                            id={day != null ? `wh-day-${key}` : undefined}
                            className={`min-h-[36px] flex items-start justify-end p-1.5 border-r border-gray-100 dark:border-gray-700 last:border-r-0 ${
                              isEmpty
                                ? 'bg-gray-50/50 dark:bg-gray-800/50'
                                : isToday
                                  ? 'bg-primary-50/50 dark:bg-primary-900/30'
                                  : 'bg-white dark:bg-gray-800'
                            }`}
                            style={{ gridColumn: c + 1, gridRow: 1 }}
                          >
                            {day != null && (
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                                  isToday
                                    ? 'bg-primary-500 text-white ring-2 ring-primary-200 dark:ring-primary-800'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {day}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {[0, 1, 2, 3, 4, 5, 6].map((c) => {
                        const day = dayNumFor(r, c);
                        const key =
                          day != null
                            ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                            : `bpad-${r}-${c}`;
                        const isEmpty = day == null;
                        const dayData = day != null ? dayByYmd.get(key) : null;
                        const dayHeading =
                          dayData?.inst?.toLocaleDateString(undefined, {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          }) ?? '';

                        let barContent = null;
                        if (!isEmpty && dayData?.blocks?.length) {
                          const laneCount = Math.max(1, dayData.maxLanes);
                          const lanesArr = blocksGroupedByLane(dayData.blocks, laneCount);
                          const picked = [];
                          outer: for (const lb of lanesArr) {
                            for (const b of lb) {
                              picked.push(b);
                              if (picked.length >= MG_MAX_BARS) break outer;
                            }
                          }
                          const overflow = Math.max(0, dayData.blocks.length - picked.length);
                          barContent = (
                            <>
                              <div
                                className="flex flex-col w-full min-h-0 flex-1 overflow-hidden justify-start py-0.5"
                                style={{ gap: MG_ROW_GAP }}
                              >
                                {picked.map((block) => {
                                  const rangeText = blockRangeText(block);
                                  const pal = memberBarPalette(block.userId);
                                  const editHref = getEditMemberScheduleHref?.(block.userId);
                                  return (
                                    <WorkShiftAllocationPopover
                                      key={`${r}-${c}-${block.rowKey}`}
                                      className={`flex items-center gap-1 min-w-0 w-full rounded px-1.5 overflow-hidden border text-left text-xs font-medium shadow-sm ${pal.bar} hover:brightness-95 dark:hover:brightness-110`}
                                      style={{ minHeight: MG_THIN_BAR }}
                                      profile={{
                                        name: block.label,
                                        photoUrl: block.photoUrl,
                                        email: block.email,
                                        role: block.role,
                                      }}
                                      weeklyLines={weeklyLinesByUser.get(block.userId) ?? []}
                                      blockRange={rangeText}
                                      dayHeading={dayHeading}
                                      editScheduleHref={editHref}
                                    >
                                      <div className="flex min-w-0 items-center gap-1 w-full">
                                        {block.photoUrl ? (
                                          <Avatar
                                            src={block.photoUrl}
                                            name={block.label}
                                            size="sm"
                                            className="flex-shrink-0 !size-3 !text-[6px] bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                                          />
                                        ) : null}
                                        <span className={`truncate tabular-nums font-medium ${pal.time}`}>{rangeText}</span>
                                      </div>
                                    </WorkShiftAllocationPopover>
                                  );
                                })}
                              </div>
                              {overflow > 0 ? (
                                <div className="flex items-center px-1 pt-0.5 text-[10px] text-primary-600 dark:text-primary-400 font-medium leading-none">
                                  +{overflow} more
                                </div>
                              ) : null}
                            </>
                          );
                        }

                        return (
                          <div
                            key={`b-${r}-${c}`}
                            className={`border-r border-gray-100 dark:border-gray-700 last:border-r-0 flex flex-col justify-start overflow-hidden ${
                              isEmpty ? 'bg-gray-50/30 dark:bg-gray-800/40' : 'bg-white dark:bg-gray-800'
                            }`}
                            style={{ gridColumn: c + 1, gridRow: 2, minHeight: MG_BAR_STRIP_H }}
                          >
                            {!isEmpty ? barContent : null}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
      role="region"
      aria-label={`${teamColumnLabel} monthly work hours`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{monthTitle}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Previous month"
          >
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30"
          >
            <HiCalendar className="w-4 h-4" />
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Next month"
          >
            <HiChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-3 w-full max-w-full">
        <div className="w-full min-w-0" style={{ minWidth: dayLabelW + timelineMinWidth }}>
          <div className="flex w-full min-w-0 border-b border-gray-200 dark:border-gray-700">
            <div
              className="sticky left-0 z-30 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-[10px] font-medium text-gray-600 dark:text-gray-300 flex items-center justify-center"
              style={{ width: dayLabelW, minWidth: dayLabelW, height: headerRowH }}
            >
              Day
            </div>
            <div
              className="flex-1 min-w-0 grid bg-gray-50 dark:bg-gray-800/80"
              style={{ gridTemplateColumns, height: headerRowH }}
            >
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  className="min-w-0 border-r border-gray-100 dark:border-gray-600/60 text-[8px] sm:text-[9px] text-gray-600 dark:text-gray-400 leading-none flex items-end justify-center pb-1 px-0.5 last:border-r-0"
                >
                  <Tooltip content={slot} placement="bottom">
                    <span className="block truncate text-center max-w-full">{slot}</span>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>

          {monthDays.map((day) => {
            const isToday = day.ymd === todayKey;
            const laneCount = Math.max(1, day.maxLanes);
            const lanes = blocksGroupedByLane(day.blocks, laneCount);
            const dayHeading = day.inst.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            });

            return (
              <div
                key={day.ymd}
                id={`wh-day-${day.ymd}`}
                className={`flex w-full min-w-0 items-stretch border-b border-gray-100 dark:border-gray-700 scroll-mt-20 ${
                  isToday ? 'bg-primary-50/40 dark:bg-primary-900/15' : ''
                }`}
              >
                <div
                  className={`sticky left-0 z-20 flex w-[44px] min-w-[44px] flex-shrink-0 items-center justify-center border-r border-gray-200 dark:border-gray-700 text-xs font-semibold self-stretch ${
                    isToday
                      ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-200'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {isToday ? (
                    <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1 rounded-full bg-primary-500 text-white text-xs font-bold">
                      {day.dayNum}
                    </span>
                  ) : (
                    <span>{day.dayNum}</span>
                  )}
                </div>

                <div className="relative flex min-w-0 flex-1 flex-col bg-white/50 dark:bg-gray-800/40">
                  <div
                    className="absolute inset-0 z-0 grid min-h-full pointer-events-none"
                    style={{ gridTemplateColumns }}
                  >
                    {timeSlots.map((_, i) => (
                      <div
                        key={i}
                        className="min-w-0 border-r border-gray-100 dark:border-gray-600/50 last:border-r-0"
                      />
                    ))}
                  </div>

                  {lanes.map((laneBlocks, laneIdx) => (
                    <div
                      key={laneIdx}
                      className="relative z-[1] min-h-[max(1em,calc(1lh+0.25rem))] w-full shrink-0 text-[9px] leading-none sm:text-[10px]"
                    >
                      {laneBlocks.map((block) => {
                        const span = block.endSlot - block.startSlot;
                        const n = slotCount || 1;
                        const leftPct = (block.startSlot / n) * 100;
                        const widthPct = (span / n) * 100;
                        const rangeText = blockRangeText(block);
                        const pal = memberBarPalette(block.userId);
                        const editHref = getEditMemberScheduleHref?.(block.userId);

                        const shellClass = `absolute rounded border overflow-hidden text-left shadow-sm ${
                          pal.bar
                        } hover:brightness-95 dark:hover:brightness-110`;

                        const shellStyle = {
                          left: `calc(${leftPct}% + 0.25px)`,
                          width: `calc(${widthPct}% - 0.5px)`,
                          minWidth: '1.25rem',
                          top: 0,
                          bottom: 0,
                        };

                        return (
                          <WorkShiftAllocationPopover
                            key={block.rowKey}
                            className={shellClass}
                            style={shellStyle}
                            profile={{
                              name: block.label,
                              photoUrl: block.photoUrl,
                              email: block.email,
                              role: block.role,
                            }}
                            weeklyLines={weeklyLinesByUser.get(block.userId) ?? []}
                            blockRange={rangeText}
                            dayHeading={dayHeading}
                            editScheduleHref={editHref}
                          >
                            <div className="flex h-full min-h-0 min-w-0 items-center px-2.5 py-[0.025rem] gap-px">
                              {editHref ? (
                                <Link
                                  href={editHref}
                                  className="min-w-0 shrink font-semibold truncate text-gray-900 dark:text-white underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {block.label}
                                </Link>
                              ) : (
                                <span className="min-w-0 shrink font-semibold truncate text-gray-900 dark:text-white">
                                  {block.label}
                                </span>
                              )}
                              <span className="font-normal text-gray-400 dark:text-gray-500 shrink-0" aria-hidden>
                                ·
                              </span>
                              <span className={`font-medium tabular-nums min-w-0 truncate ${pal.time}`}>
                                {rangeText}
                              </span>
                            </div>
                          </WorkShiftAllocationPopover>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
