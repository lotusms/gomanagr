/**
 * Skeleton loading state for the Services page.
 * Matches the layout: PageHeader (title, description, Add service button), grid of service cards, pagination footer.
 */
export default function ServicesPageSkeleton() {
  return (
    <div className="space-y-6" data-testid="services-page-skeleton">
      {/* Header: title, description, Add service button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="h-9 w-28 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-4 max-w-xl rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="flex-shrink-0">
          <div className="h-10 w-36 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>

      {/* Grid of service card placeholders (same grid as real page: lg:grid-cols-3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
          >
            {/* Card header bar */}
            <div className="bg-gray-300 dark:bg-gray-600 px-5 py-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-400 dark:bg-gray-500" />
                  <div className="h-5 w-24 rounded bg-gray-400 dark:bg-gray-500" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-400 dark:bg-gray-500" />
                  <div className="w-8 h-8 rounded-lg bg-gray-400 dark:bg-gray-500" />
                </div>
              </div>
            </div>

            {/* Card body */}
            <div className="p-5 flex-1 flex flex-col">
              {/* Description line (optional on real card) */}
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-4" />

              {/* Assigned members section */}
              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
                  <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse" />
                  <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse" />
                  {i % 2 === 0 && (
                    <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination footer: Items per page */}
      <div className="mt-6 flex items-center gap-2">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-9 w-14 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
    </div>
  );
}
