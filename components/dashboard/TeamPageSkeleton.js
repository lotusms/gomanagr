/**
 * Skeleton loading state for the Team page.
 * Matches the layout: PageHeader (title, description, actions), Filters bar, grid of team member cards.
 */
export default function TeamPageSkeleton() {
  return (
    <div className="space-y-6" data-testid="team-page-skeleton">
      {/* Header: title, description, action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="h-9 w-24 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-4 w-72 max-w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <div className="h-10 w-[9.5rem] rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-10 w-32 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="w-full flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-5 w-14 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
          <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>

      {/* Grid of card placeholders (4 cards to match xl:grid-cols-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="relative rounded-2xl overflow-hidden min-h-[200px] bg-gray-200 dark:bg-gray-700 animate-pulse"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <div className="mb-4 h-20 w-20 rounded-full bg-gray-300 dark:bg-gray-600" />
              <div className="h-5 w-28 rounded bg-gray-300 dark:bg-gray-600 mb-2" />
              <div className="h-4 w-20 rounded bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-600" />
          </div>
        ))}
      </div>
    </div>
  );
}
