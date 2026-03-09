/**
 * Skeleton loading state for the tasks page views (board, list, calendar).
 * Renders a skeleton that matches the selected view layout.
 */
import { TASK_STATUSES } from '@/config/taskConstants';

const PULSE = 'animate-pulse bg-gray-200 dark:bg-gray-700';

function BoardSkeleton() {
  return (
    <div className="relative -mx-1 px-1 py-2 overflow-x-auto overflow-y-hidden" data-testid="tasks-board-skeleton">
      <div className="flex gap-5 min-w-0 pb-2" style={{ width: 'max-content', minWidth: '100%' }}>
        {TASK_STATUSES.slice(0, 5).map((s) => (
          <div
            key={s.value}
            className="flex-shrink-0 w-72 flex flex-col max-h-[calc(100vh-12rem)] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
              <div className={`h-4 w-20 rounded ${PULSE}`} />
              <div className={`h-7 w-8 rounded-lg ${PULSE}`} />
            </div>
            <div className="flex-1 p-3 space-y-3 min-h-[120px]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-600 p-3.5 space-y-2">
                  <div className={`h-4 w-3/4 rounded ${PULSE}`} />
                  <div className={`h-3 w-24 rounded ${PULSE}`} />
                  <div className="flex justify-between pt-2">
                    <div className={`h-6 w-14 rounded-md ${PULSE}`} />
                    <div className={`h-8 w-8 rounded-full ${PULSE}`} />
                  </div>
                </div>
              ))}
              <div className={`rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 h-14 ${PULSE}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  const rows = 8;
  const colCount = 6;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-600" data-testid="tasks-list-skeleton">
      <table className="w-full min-w-[500px] table-fixed">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700/50">
            {Array.from({ length: colCount }, (_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <div className={`h-4 w-16 rounded ${PULSE}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-100 dark:border-gray-700/50">
              {Array.from({ length: colCount }, (_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div
                    className={`h-4 rounded ${PULSE}`}
                    style={{ width: colIndex === 0 ? '70%' : colIndex === 2 ? '60%' : '40%' }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GanttSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden" data-testid="tasks-gantt-skeleton">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex gap-2">
          <div className={`h-9 w-9 rounded-lg ${PULSE}`} />
          <div className={`h-9 w-9 rounded-lg ${PULSE}`} />
        </div>
      </div>
      <div className="flex min-w-max">
        <div className="flex-shrink-0 w-60 border-r border-gray-200 dark:border-gray-600 p-3 space-y-2">
          <div className={`h-4 w-16 rounded ${PULSE}`} />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-6 w-6 rounded-full ${PULSE}`} />
              <div className={`h-4 flex-1 rounded ${PULSE}`} />
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-[400px] p-3 border-b border-gray-200 dark:border-gray-600">
          <div className="flex gap-1 mb-2">
            {Array.from({ length: 14 }, (_, i) => (
              <div key={i} className={`h-8 flex-1 rounded ${PULSE}`} />
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-1 h-11 items-center">
              <div className={`h-7 w-24 rounded ${PULSE}`} style={{ marginLeft: `${i * 8}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden" data-testid="tasks-calendar-skeleton">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-600">
        <div className={`h-6 w-32 rounded ${PULSE}`} />
        <div className="flex gap-2">
          <div className={`h-9 w-9 rounded-lg ${PULSE}`} />
          <div className={`h-9 w-20 rounded-lg ${PULSE}`} />
          <div className={`h-9 w-9 rounded-lg ${PULSE}`} />
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-600">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="p-2 text-center">
            <div className={`h-4 w-10 rounded mx-auto ${PULSE}`} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-gray-700 min-h-[400px]">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="p-2 min-h-[80px] space-y-1">
            <div className={`h-4 w-full rounded ${PULSE}`} />
            <div className={`h-4 w-2/3 rounded ${PULSE}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TasksViewSkeleton({ view = 'board' }) {
  if (view === 'board') return <BoardSkeleton />;
  if (view === 'calendar') return <CalendarSkeleton />;
  if (view === 'gantt') return <GanttSkeleton />;
  return <ListSkeleton />;
}
