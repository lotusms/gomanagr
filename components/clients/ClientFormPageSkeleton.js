/**
 * Skeleton loading state for Add client and Edit client pages.
 * Matches the layout: PageHeader, "This client is a company" toggle, tabbed card (Basic Information style), action buttons.
 * @param {string} [projectTermPlural] - Optional industry-based label for the projects tab (e.g. "Cases" for Healthcare).
 */
export default function ClientFormPageSkeleton({ projectTermPlural }) {
  const tabLabels = ['Basic Information', 'Financial', projectTermPlural || 'Projects', 'Communication', 'Documents', 'Schedule'];
  return (
    <div className="space-y-6" data-testid="client-form-page-skeleton">
      {/* Header: title, description, Back button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="h-9 w-48 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-4 w-72 max-w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="flex-shrink-0">
          <div className="h-10 w-36 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>

      {/* Toggle: This client is a company */}
      <div className="flex items-center gap-3">
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-4 w-6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-4 w-6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Card: tab bar + content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Tab bar */}
        <div className="flex gap-1 px-4 border-b border-gray-200 dark:border-gray-700">
          {tabLabels.map((label, i) => (
            <div
              key={i}
              className="h-12 flex-1 min-w-0 max-w-[120px] rounded-t bg-gray-200 dark:bg-gray-700 animate-pulse mt-px"
            />
          ))}
        </div>
        {/* Basic Information content area */}
        <div className="p-6 space-y-4">
          <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-14 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-10 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-10 w-24 rounded-lg bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <div className="h-10 w-20 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-10 w-32 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
    </div>
  );
}
