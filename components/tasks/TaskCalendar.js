import { useMemo, useState } from 'react';
import Link from 'next/link';
import { HiChevronLeft, HiChevronRight, HiCalendar } from 'react-icons/hi';
import Avatar from '@/components/ui/Avatar';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD to Date at local midnight */
function parseYmd(ymd) {
  if (!ymd || typeof ymd !== 'string') return null;
  const m = String(ymd).trim().slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

/** Date to YYYY-MM-DD in local time */
function toYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Get the date keys (YYYY-MM-DD) that this task spans: start day = day 1, for duration_days.
 * Prefer start_date + duration; else due_at as last day with duration_days.
 */
function getTaskDateKeys(task) {
  const duration = Math.max(1, parseInt(task.duration_days, 10) || 1);
  let startDate;
  if (task.start_date && String(task.start_date).trim()) {
    startDate = parseYmd(String(task.start_date).trim().slice(0, 10));
  } else if (task.due_at) {
    const ymd = toDateKey(task.due_at);
    if (!ymd) return [];
    const last = parseYmd(ymd);
    if (!last) return [];
    startDate = new Date(last);
    startDate.setDate(startDate.getDate() - (duration - 1));
  } else {
    return [];
  }
  if (!startDate) return [];
  const keys = [];
  for (let i = 0; i < duration; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    keys.push(toYmd(d));
  }
  return keys;
}

export default function TaskCalendar({ tasks = [], assigneeNameById = {}, assigneePhotoById = {} }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { year, month } = cursor;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const totalCells = startPad + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  const monthStartKey = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEndKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  /** Tasks that span 2+ days: list of { task, weekIndex, colStart, colEnd, lane } for bars in this month */
  const spanSegmentsByWeek = useMemo(() => {
    const byWeek = {};
    for (let r = 0; r < rows; r++) byWeek[r] = [];
    tasks.forEach((t) => {
      const keys = getTaskDateKeys(t);
      if (keys.length < 2) return;
      const inMonth = keys.filter((k) => k >= monthStartKey && k <= monthEndKey);
      if (inMonth.length === 0) return;
      const first = inMonth[0];
      const last = inMonth[inMonth.length - 1];
      const dayNumFirst = parseInt(first.slice(8, 10), 10);
      const dayNumLast = parseInt(last.slice(8, 10), 10);
      const cellStart = startPad + (dayNumFirst - 1);
      const cellEnd = startPad + (dayNumLast - 1);
      const weekStart = Math.floor(cellStart / 7);
      const weekEnd = Math.floor(cellEnd / 7);
      for (let w = weekStart; w <= weekEnd; w++) {
        const colStart = w === weekStart ? cellStart % 7 : 0;
        const colEnd = w === weekEnd ? cellEnd % 7 : 6;
        byWeek[w].push({ task: t, colStart, colEnd });
      }
    });
    for (let r = 0; r < rows; r++) {
      const segments = byWeek[r];
      segments.sort((a, b) => a.colStart - b.colStart);
      let lane = 0;
      const endByLane = {};
      segments.forEach((seg) => {
        while (endByLane[lane] != null && endByLane[lane] >= seg.colStart) lane++;
        seg.lane = lane;
        endByLane[lane] = seg.colEnd;
      });
    }
    return byWeek;
  }, [tasks, year, month, rows, startPad, monthStartKey, monthEndKey]);

  /** Single-day tasks only (for day cell lists); multi-day tasks shown as bars */
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      const keys = getTaskDateKeys(t);
      if (keys.length > 1) return;
      const key = keys[0];
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  const today = new Date();
  const todayKey = toDateKey(today.toISOString().slice(0, 10));

  const monthLabel = firstDay.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const goPrev = () => {
    setCursor((c) => {
      if (c.month === 0) return { year: c.year - 1, month: 11 };
      return { ...c, month: c.month - 1 };
    });
  };

  const goNext = () => {
    setCursor((c) => {
      if (c.month === 11) return { year: c.year + 1, month: 0 };
      return { ...c, month: c.month + 1 };
    });
  };

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
  };

  const CELL_MIN_HEIGHT = 100;
  const BAR_ROW_HEIGHT = 28;

  /** For week row r, get day number for column c (1-based day or null if padding/out of month) */
  function dayNumFor(r, c) {
    const cellIndex = r * 7 + c;
    if (cellIndex < startPad) return null;
    const day = cellIndex - startPad + 1;
    return day <= daysInMonth ? day : null;
  }

  const gridRows = [];
  for (let r = 0; r < rows; r++) {
    const segments = spanSegmentsByWeek[r] || [];
    const barStripHeight =
      segments.length > 0
        ? BAR_ROW_HEIGHT * (Math.max(0, ...segments.map((s) => s.lane)) + 1)
        : BAR_ROW_HEIGHT;

    gridRows.push(
      <tr key={r}>
        <td
          colSpan={7}
          className="align-top p-0 border-b border-gray-100 dark:border-gray-700"
          style={{ verticalAlign: 'top' }}
        >
          <div
            className="grid w-full border-b border-gray-100 dark:border-gray-700"
            style={{
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridTemplateRows: `auto ${barStripHeight}px minmax(${CELL_MIN_HEIGHT}px, 1fr)`,
            }}
          >
            {/* Row 1: Day numbers on top (Apple-style) */}
            {[0, 1, 2, 3, 4, 5, 6].map((c) => {
              const day = dayNumFor(r, c);
              const key =
                day != null
                  ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  : `pad-${r}-${c}`;
              const isToday = key !== `pad-${r}-${c}` && key === todayKey;
              const isEmpty = day == null;
              return (
                <div
                  key={key}
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

            {/* Row 2: Event bar strip – directly under day numbers, on top of content */}
            <div
              className="grid gap-0 px-0.5 py-0 border-r border-gray-100 dark:border-gray-700 last:border-r-0 bg-white dark:bg-gray-800"
              style={{
                gridColumn: '1 / -1',
                gridRow: 2,
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridAutoRows: `${BAR_ROW_HEIGHT}px`,
              }}
            >
              {segments.map((seg) => (
                <Link
                  key={`${seg.task.id}-${r}-${seg.colStart}`}
                  href={`/dashboard/tasks/${seg.task.id}/edit`}
                  className="flex items-center gap-1.5 min-w-0 h-full rounded px-2 py-0 overflow-hidden bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200 border border-primary-200/50 dark:border-primary-700/50 hover:opacity-90 transition-opacity text-xs font-medium"
                  style={{
                    gridColumn: `${seg.colStart + 1} / ${seg.colEnd + 2}`,
                    gridRow: seg.lane + 1,
                  }}
                  title={seg.task.title}
                >
                  {seg.task.assignee_id &&
                    (assigneeNameById[seg.task.assignee_id] || assigneePhotoById[seg.task.assignee_id]) && (
                      <Avatar
                        src={assigneePhotoById[seg.task.assignee_id] || undefined}
                        name={assigneeNameById[seg.task.assignee_id] || 'Unknown'}
                        size="sm"
                        className="flex-shrink-0 !size-4 !text-[8px] bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                      />
                    )}
                  <span className="truncate">{seg.task.title || 'Untitled'}</span>
                </Link>
              ))}
            </div>

            {/* Row 3: Single-day task lists */}
            {[0, 1, 2, 3, 4, 5, 6].map((c) => {
              const day = dayNumFor(r, c);
              const key =
                day != null
                  ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  : `pad-${r}-${c}`;
              const dayTasks = day != null ? tasksByDate[key] || [] : [];
              const isToday = key !== `pad-${r}-${c}` && key === todayKey;
              const isEmpty = day == null;
              return (
                <div
                  key={`list-${key}`}
                  className={`min-h-0 overflow-y-auto p-2 border-r border-gray-100 dark:border-gray-700 last:border-r-0 ${
                    isEmpty
                      ? 'bg-gray-50/50 dark:bg-gray-800/50'
                      : isToday
                        ? 'bg-primary-50/50 dark:bg-primary-900/30'
                        : 'bg-white dark:bg-gray-800'
                  }`}
                  style={{ gridColumn: c + 1, gridRow: 3 }}
                >
                  <ul className="space-y-1">
                    {dayTasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-1 min-w-0">
                        {t.assignee_id &&
                          (assigneeNameById[t.assignee_id] || assigneePhotoById[t.assignee_id]) && (
                            <Avatar
                              src={assigneePhotoById[t.assignee_id] || undefined}
                              name={assigneeNameById[t.assignee_id] || 'Unknown'}
                              size="sm"
                              className="flex-shrink-0 !size-5 !text-[8px] bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                            />
                          )}
                        <Link
                          href={`/dashboard/tasks/${t.id}/edit`}
                          className="flex-1 min-w-0 text-xs font-medium truncate block rounded px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200 border border-primary-200/50 dark:border-primary-700/50 hover:opacity-90 transition-opacity"
                          title={t.title}
                        >
                          {t.title || 'Untitled'}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Nav bar – match Schedule: justify-between px-4 py-3 border-b, month label, Today + arrows */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{monthLabel}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Previous month"
          >
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30"
          >
            <HiCalendar className="w-4 h-4" />
            Today
          </button>
          <button
            type="button"
            onClick={goNext}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Next month"
          >
            <HiChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekday headers – match Schedule thead: uppercase, day number in circle for column header style */}
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
          <tbody>{gridRows}</tbody>
        </table>
      </div>
    </div>
  );
}
