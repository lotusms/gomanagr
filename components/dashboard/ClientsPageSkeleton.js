/**
 * Skeleton loading state for the Clients page.
 * Matches the layout: PageHeader (title, description, Deactivated Clients + Add client buttons, settings icon), grid of client cards.
 */
export default function ClientsPageSkeleton() {
  return (
    <div className="space-y-6" data-testid="clients-page-skeleton">
      {/* Header: title, description, action buttons + settings icon */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="h-9 w-24 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-4 max-w-xl rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <div className="h-10 w-[10rem] rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-10 w-28 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>

      {/* Grid of client card placeholders (same grid as real page: xl:grid-cols-4) */}
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
