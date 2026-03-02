/**
 * Skeleton loading state for the Proposals page.
 * Matches the layout: PageHeader, grid of services-style proposal cards (sm:grid-cols-2 lg:grid-cols-3).
 */
export default function ProposalsPageSkeleton() {
  return (
    <div className="space-y-6" data-testid="proposals-page-skeleton">
      {/* Header: title, description, Create proposal button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="h-9 w-28 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-4 max-w-xl rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="flex-shrink-0">
          <div className="h-10 w-40 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>

      {/* Grid of services-style proposal card placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 flex flex-col"
          >
            <div className="bg-gray-300 dark:bg-gray-600 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-400 dark:bg-gray-500 animate-pulse" />
                <div className="h-6 w-3/4 rounded bg-gray-400 dark:bg-gray-500 animate-pulse" />
              </div>
            </div>
            <div className="p-5 flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
                <div className="h-3 w-14 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              </div>
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
