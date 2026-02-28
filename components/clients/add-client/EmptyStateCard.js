/**
 * Empty state placeholder: dashed border box with message and optional primary action.
 * Used by Communication Log and Documents & Files when a section has no entries.
 */

export default function EmptyStateCard({ message, action }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-600 py-12 text-center">
      <p className={`text-sm text-gray-400 dark:text-gray-500 ${action ? 'mb-4' : ''}`}>{message}</p>
      {action}
    </div>
  );
}
