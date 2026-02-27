/**
 * Skeleton loading state for the Schedule page.
 * Matches the layout: PageHeader (title, description, Add appointment), calendar nav (month, Today, arrows), weekly grid (time column + day columns).
 */
export default function SchedulePageSkeleton() {
  const timeRowCount = 14;

  return (
    <div className="space-y-6" data-testid="schedule-page-skeleton">
      {/* Header: title, description, Add appointment button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="h-9 w-28 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-4 max-w-xl rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="flex-shrink-0">
          <div className="h-10 w-40 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>

      {/* Calendar card: nav bar + grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Calendar nav: month/year, arrows + Today */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="flex items-center gap-1">
            <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-9 w-16 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>

        {/* Table: time column + 7 day columns */}
        <div className="overflow-x-auto">
          <div className="w-full min-w-[600px] border-collapse">
            {/* Day headers */}
            <div className="grid grid-cols-[3.5rem_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="p-2" />
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="p-2 flex flex-col items-center gap-1">
                  <div className="h-3 w-8 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse" />
                </div>
              ))}
            </div>
            {/* Time rows */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {Array.from({ length: timeRowCount }, (_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-[3.5rem_1fr_1fr_1fr_1fr_1fr_1fr_1fr] min-h-[2.5rem]"
                >
                  <div className="p-1.5 flex items-center">
                    <div className="h-3 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  </div>
                  {[1, 2, 3, 4, 5, 6, 7].map((colIndex) => {
                    const isAppointment =
                      (rowIndex === 2 && colIndex === 1) ||
                      (rowIndex === 6 && colIndex === 3) ||
                      (rowIndex === 10 && colIndex === 6);
                    return (
                      <div
                        key={colIndex}
                        className={`p-1 border-r border-gray-100 dark:border-gray-700 last:border-r-0 ${
                          isAppointment ? 'bg-primary-100/50 dark:bg-primary-900/20' : ''
                        }`}
                      >
                        {isAppointment ? (
                          <div className="min-h-[2.25rem] rounded border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 animate-pulse">
                            <div className="p-1.5 space-y-1">
                              <div className="h-3 w-3/4 rounded bg-primary-200 dark:bg-primary-700" />
                              <div className="h-2.5 w-1/2 rounded bg-primary-200/80 dark:bg-primary-700/80" />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
