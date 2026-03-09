import { useMemo, useRef } from 'react';
import Link from 'next/link';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import Avatar from '@/components/ui/Avatar';

const ROW_HEIGHT = 44;
const LABEL_WIDTH = 240;

/** Start of day (00:00:00.000) in UTC for a given timestamp */
function toDayStart(ts) {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/** Previous Monday 00:00 UTC from the given date */
function getSprintMonday(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/** Parse YYYY-MM-DD as UTC midnight */
function parseDateUTC(ymd) {
  if (!ymd || typeof ymd !== 'string') return null;
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

/**
 * Compute sprint range start from an anchor date.
 * Returns the start of the sprint period that contains 'now' (or the first sprint if now < anchor).
 */
function getSprintRangeStartFromAnchor(anchorDateMs, nowMs, periodMs) {
  const elapsed = nowMs - anchorDateMs;
  const periods = Math.floor(elapsed / periodMs);
  const offset = periods < 0 ? 0 : periods * periodMs;
  return anchorDateMs + offset;
}

/**
 * Bar span: start day = day 1. E.g. start 8th, 3 days → bar on 8, 9, 10 (not 11).
 * Prefer start_date + duration_days. If no start_date, fall back to due_at as last day (parse as UTC date to avoid timezone shift).
 */
function getBarStartEnd(task) {
  const dayMs = 24 * 60 * 60 * 1000;
  const duration = Math.max(1, parseInt(task.duration_days, 10) || 1);

  if (task.start_date && String(task.start_date).trim()) {
    const ymd = String(task.start_date).trim().slice(0, 10);
    const startTs = parseDateUTC(ymd);
    if (startTs == null || Number.isNaN(startTs)) return null;
    const endTs = startTs + duration * dayMs;
    return { startTs, endTs, duration };
  }

  if (!task.due_at) return null;
  const ymd = String(task.due_at).slice(0, 10);
  const endDayStart = parseDateUTC(ymd);
  if (endDayStart == null || Number.isNaN(endDayStart)) return null;
  const startTs = endDayStart - (duration - 1) * dayMs;
  const endTs = endDayStart + dayMs;
  return { startTs, endTs, duration };
}

export default function TaskGantt({
  tasks = [],
  assigneeNameById = {},
  assigneePhotoById = {},
  sprintWeeks = 4,
  sprintStartDate = null,
  taskTermSingular = 'Task',
  taskTermPlural = 'tasks',
}) {
  const scrollRef = useRef(null);
  const weeks = Math.max(2, Math.min(6, parseInt(sprintWeeks, 10) || 4));
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = weeks * 7;
  const periodMs = totalDays * dayMs;

  const { rangeStart, rangeEnd, ticks, ganttTasks } = useMemo(() => {
    const now = Date.now();
    const rangeStart = (() => {
      const anchor = parseDateUTC(sprintStartDate);
      if (anchor != null && !Number.isNaN(anchor)) {
        return getSprintRangeStartFromAnchor(anchor, now, periodMs);
      }
      return getSprintMonday(now);
    })();
    const rangeEnd = rangeStart + periodMs;
    const ticks = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(rangeStart + i * dayMs);
      ticks.push({
        ts: d.getTime(),
        label: d.getUTCDate(),
        isFirst: d.getUTCDate() === 1,
        month: d.toLocaleString(undefined, { month: 'short' }),
      });
    }
    const ganttTasks = tasks.filter((t) => {
      const bar = getBarStartEnd(t);
      if (!bar) return false;
      return bar.startTs < rangeEnd && bar.endTs > rangeStart;
    });
    return { rangeStart, rangeEnd, ticks, ganttTasks };
  }, [tasks, totalDays, dayMs, periodMs, sprintStartDate]);

  const scrollByWeek = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const timelineEl = el.querySelector('[data-gantt-timeline]');
    const dayPx = timelineEl ? timelineEl.offsetWidth / totalDays : 56;
    el.scrollLeft += dir * 7 * dayPx;
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByWeek(-1)}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            aria-label="Scroll left"
          >
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByWeek(1)}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            aria-label="Scroll right"
          >
            <HiChevronRight className="w-5 h-5" />
          </button>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Sprint: {weeks} week{weeks === 1 ? '' : 's'} • One column = 1 day
        </span>
      </div>
      <div ref={scrollRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-14rem)]">
        <div className="flex w-full min-w-0">
          {/* Task labels column */}
          <div
            className="flex-shrink-0 border-r border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 sticky left-0 z-10"
            style={{ width: LABEL_WIDTH }}
          >
            <div
              className="flex items-center px-3 py-2 border-b border-gray-200 dark:border-gray-600 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              style={{ height: ROW_HEIGHT }}
            >
              {taskTermSingular}
            </div>
            {ganttTasks.length === 0 ? (
              <div
                className="flex items-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-sm text-gray-500 dark:text-gray-400"
                style={{ height: ROW_HEIGHT }}
              >
                No {taskTermPlural} with due date in this sprint
              </div>
            ) : (
              ganttTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 dark:border-gray-700/50"
                  style={{ height: ROW_HEIGHT }}
                >
                  {task.assignee_id && (assigneeNameById[task.assignee_id] || assigneePhotoById[task.assignee_id]) && (
                    <Avatar
                      src={assigneePhotoById[task.assignee_id] || undefined}
                      name={assigneeNameById[task.assignee_id] || '?'}
                      className="!w-6 !h-6 flex-shrink-0 text-xs"
                    />
                  )}
                  <Link
                    href={`/dashboard/tasks/${task.id}/edit`}
                    className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white truncate hover:text-primary-600 dark:hover:text-primary-400"
                    title={task.title}
                  >
                    {task.title || 'Untitled'}
                  </Link>
                </div>
              ))
            )}
          </div>
          {/* Timeline: days split evenly across available width */}
          <div data-gantt-timeline className="flex-1 min-w-0 flex flex-col">
            <div className="flex w-full border-b border-gray-200 dark:border-gray-600" style={{ height: ROW_HEIGHT }}>
              {ticks.map((t, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-0 flex flex-col items-center justify-center border-r border-gray-100 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400 last:border-r-0"
                  style={{ flex: '1 1 0%' }}
                >
                  {t.isFirst ? (
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t.month}</span>
                  ) : null}
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0">
            {ganttTasks.length === 0 ? (
              <div
                className="border-b border-gray-100 dark:border-gray-700/50"
                style={{ height: ROW_HEIGHT }}
              />
            ) : (
              ganttTasks.map((task) => {
                const bar = getBarStartEnd(task);
                if (!bar) return null;
                const { startTs, endTs, duration } = bar;
                const left = Math.max(0, ((startTs - rangeStart) / (rangeEnd - rangeStart)) * 100);
                const width = Math.min(100 - left, ((endTs - startTs) / (rangeEnd - rangeStart)) * 100);
                if (width < 0.5) return null;
                return (
                  <div
                    key={task.id}
                    className="relative border-b border-gray-100 dark:border-gray-700/50"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <Link
                      href={`/dashboard/tasks/${task.id}/edit`}
                      className="absolute top-1.5 h-7 rounded-md bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium truncate px-2 flex items-center shadow-sm border border-primary-600/30"
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(2, width)}%`,
                        minWidth: 20,
                      }}
                      title={`${task.title || 'Untitled'} • ${duration} day${duration === 1 ? '' : 's'} • Due ${task.due_at ? formatDateFromISO(task.due_at) : ''}`}
                    >
                      {duration}d
                    </Link>
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
