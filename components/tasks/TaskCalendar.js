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

export default function TaskCalendar({ tasks = [], assigneeNameById = {}, assigneePhotoById = {} }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      const key = toDateKey(t.due_at);
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  const today = new Date();
  const todayKey = toDateKey(today.toISOString().slice(0, 10));

  const { year, month } = cursor;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const totalCells = startPad + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

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

  const CELL_HEIGHT = 120;

  const dayCells = [];
  for (let i = 0; i < startPad; i++) {
    dayCells.push(
      <td
        key={`pad-${i}`}
        className="align-top min-w-0 p-0 border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
        style={{ height: CELL_HEIGHT }}
      />
    );
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = tasksByDate[key] || [];
    const isToday = key === todayKey;
    dayCells.push(
      <td
        key={key}
        className={`align-top min-w-0 p-2 border border-gray-100 dark:border-gray-700 ${
          isToday ? 'bg-primary-50/50 dark:bg-primary-900/30' : 'bg-white dark:bg-gray-800'
        }`}
        style={{ height: CELL_HEIGHT }}
      >
        <div className="flex flex-col h-full min-h-0">
          <span
            className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
              isToday
                ? 'bg-primary-500 text-white ring-2 ring-primary-200 dark:ring-primary-800'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {day}
          </span>
          <div className="flex-1 min-h-0 overflow-y-auto mt-1.5">
            <ul className="space-y-1">
              {dayTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-1 min-w-0">
                  {t.assignee_id && (assigneeNameById[t.assignee_id] || assigneePhotoById[t.assignee_id]) && (
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
        </div>
      </td>
    );
  }

  const gridRows = [];
  for (let r = 0; r < rows; r++) {
    gridRows.push(
      <tr key={r}>{dayCells.slice(r * 7, (r + 1) * 7)}</tr>
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
