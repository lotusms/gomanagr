import { useMemo, useState } from 'react';
import Link from 'next/link';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TaskCalendar({ tasks = [], assigneeNameById = {} }) {
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
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const dayCells = [];
  for (let i = 0; i < startPad; i++) {
    dayCells.push(<div key={`pad-${i}`} className="min-h-[80px] p-2 bg-gray-50 dark:bg-gray-800/50 rounded" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = tasksByDate[key] || [];
    const isToday =
      new Date().getFullYear() === year &&
      new Date().getMonth() === month &&
      new Date().getDate() === day;
    dayCells.push(
      <div
        key={key}
        className={`min-h-[80px] p-2 rounded border ${
          isToday
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
        }`}
      >
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{day}</div>
        <ul className="space-y-1">
          {dayTasks.slice(0, 3).map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/tasks/${t.id}/edit`}
                className="block text-xs truncate rounded px-1 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200 hover:underline"
                title={t.title}
              >
                {t.title || 'Untitled'}
              </Link>
            </li>
          ))}
          {dayTasks.length > 3 && (
            <li className="text-xs text-gray-500 dark:text-gray-400">+{dayTasks.length - 3} more</li>
          )}
        </ul>
      </div>
    );
  }

  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid.push(
      <div key={r} className="grid grid-cols-7 gap-1">
        {dayCells.slice(r * 7, (r + 1) * 7)}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-600">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goPrev}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            aria-label="Previous month"
          >
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            aria-label="Next month"
          >
            <HiChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="space-y-1">{grid}</div>
      </div>
    </div>
  );
}
