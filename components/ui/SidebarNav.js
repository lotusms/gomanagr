/**
 * Reusable vertical sidebar navigation: white card, icon + label per item,
 * active state (primary-50 bg), inactive hover. Used by Settings and Marketing.
 *
 * @param {Object} props
 * @param {{ id: string, label: string, icon: React.ComponentType }[]} props.items
 * @param {string} props.activeId - id of the selected item
 * @param {(id: string) => void} props.onSelect
 * @param {string} [props.ariaLabel] - aria-label for the nav
 * @param {Record<string, string>} [props.labelOverrides] - optional id -> label overrides
 * @param {string} [props.className] - optional class for the nav wrapper
 */
export default function SidebarNav({ items, activeId, onSelect, ariaLabel, labelOverrides = {}, className = '' }) {
  return (
    <nav className={`flex-shrink-0 w-full lg:w-56 ${className}`.trim()} aria-label={ariaLabel}>
      <ul className="space-y-1 bg-white dark:bg-gray-800 rounded-lg shadow p-2">
        {items.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                activeId === id
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
              {labelOverrides[id] ?? label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
