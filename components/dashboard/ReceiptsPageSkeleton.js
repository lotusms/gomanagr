/**
 * Skeleton loading state for the Receipts page.
 * Matches the layout: PageHeader, grid of receipt cards (lg:grid-cols-2).
 */
export default function ReceiptsPageSkeleton() {
  return (
    <div className="space-y-6" data-testid="receipts-page-skeleton">
      {/* Header: title + description (no button) */}
      <div className="space-y-2">
        <div className="h-9 w-32 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-4 max-w-md rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Grid of receipt-style card placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 flex flex-col"
          >
            <div className="bg-gray-300 dark:bg-gray-600 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-400 dark:bg-gray-500 animate-pulse" />
                <div className="h-6 flex-1 max-w-[200px] rounded bg-gray-400 dark:bg-gray-500 animate-pulse" />
              </div>
            </div>
            <div className="p-5 flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
                <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              </div>
              <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
