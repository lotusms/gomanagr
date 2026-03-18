import { HiTrash } from 'react-icons/hi';

/**
 * Reusable card shell for entity listings (proposals, contracts, projects,
 * invoices, campaigns, etc.).
 *
 * Provides the gradient header with icon + title + action buttons and a
 * clickable body area.  Entity-specific cards compose this shell and inject
 * their own metadata / content via `children`.
 *
 * @param {object}   props
 * @param {import('react').ComponentType} props.icon - Header icon component
 * @param {string}   props.title - Card title shown in the header
 * @param {string}   [props.headerGradient] - Tailwind gradient classes for the header
 * @param {function} props.onSelect - Called when the user clicks the card
 * @param {function} [props.onDelete] - Called when the delete button is clicked
 * @param {string}   [props.deleteTitle] - Accessible title for the delete button
 * @param {import('react').ReactNode} [props.headerActions] - Extra buttons rendered after delete (e.g. three-dot menu)
 * @param {import('react').ReactNode} props.children - Body content
 */
export default function EntityCard({
  icon: Icon,
  title,
  headerGradient = 'bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700',
  onSelect,
  onDelete,
  deleteTitle = 'Delete',
  headerActions,
  children,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.();
    }
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-600 transition-all duration-300 flex flex-col">
      <div className={`relative ${headerGradient} px-5 py-4`}>
        <div className="flex flex-wrap items-start justify-between gap-y-2">
          <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white line-clamp-2">{title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDelete();
                }}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                title={deleteTitle}
              >
                <HiTrash className="size-5" />
              </button>
            )}
            {headerActions}
          </div>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className="p-5 flex-1 flex flex-col cursor-pointer"
      >
        {children}
      </div>
    </div>
  );
}
