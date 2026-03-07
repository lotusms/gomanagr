/**
 * Skeleton loading state for the Dashboard page.
 * Matches the layout: welcome (date + greeting), StatsGrid (4 cards),
 * action cards grid (2x2), todos list, Today's appointments card.
 */
export default function DashboardSkeleton() {
  return (
    <div className="space-y-6" data-testid="dashboard-skeleton">
      {/* Welcome: date + greeting */}
      <div>
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-2" />
        <div className="h-9 w-72 max-w-full rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Stats grid: 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
          >
            <div className="p-5 flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-8 w-12 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action cards: 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="h-5 w-36 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
            <div className="p-4 space-y-3">
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-4 w-full max-w-[80%] rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-4 w-full max-w-[60%] rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              {i % 2 === 0 && (
                <div className="h-10 w-28 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse mt-2" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Todos section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's appointments card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-44 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-2" />
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="p-4">
          <div className="flex gap-2 mb-3 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-8 flex-shrink-0 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"
                style={{ width: '3rem' }}
              />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                <div className="flex-1 h-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
