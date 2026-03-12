/**
 * Skeleton for the single-receipt view (when opening one receipt via ?open=invoiceId).
 * Matches a document/receipt layout: header + one main content card.
 */
export default function ReceiptViewSkeleton() {
  return (
    <div className="space-y-6" data-testid="receipt-view-skeleton">
      <div className="space-y-2">
        <div className="h-9 w-32 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-4 max-w-md rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Single receipt/document placeholder - centered, document-style */}
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
          <div className="p-6 space-y-6">
            <div className="flex justify-between gap-4">
              <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-5 w-28 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4 space-y-3">
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <div className="h-8 w-full rounded bg-gray-200 dark:bg-gray-600 animate-pulse mb-3" />
              <div className="h-8 w-full rounded bg-gray-200 dark:bg-gray-600 animate-pulse mb-3" />
              <div className="h-8 w-2/3 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4 flex justify-end gap-4">
              <div className="h-9 w-24 rounded-lg bg-gray-200 dark:bg-gray-600 animate-pulse" />
              <div className="h-9 w-28 rounded-lg bg-gray-200 dark:bg-gray-600 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
