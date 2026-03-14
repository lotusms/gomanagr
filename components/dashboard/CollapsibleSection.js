import { HiChevronDown } from 'react-icons/hi';

/**
 * Collapsible Section Component for accordion-style UI.
 * @param {string} title - Header label
 * @param {boolean} isOpen - Whether content is expanded
 * @param {() => void} onToggle - Toggle handler
 * @param {React.ReactNode} children - Content when open
 * @param {React.ReactNode} [icon] - Optional icon element shown before title
 */
export default function CollapsibleSection({ title, isOpen, onToggle, children, icon }) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50
        shadow-sm dark:shadow-none dark:ring-1 dark:ring-gray-700/80
        transition-all duration-300 ease-out
        hover:shadow-md dark:hover:ring-primary-500/20
        ${isOpen ? 'ring-2 ring-primary-500/20 dark:ring-primary-400/30' : ''}
      `}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`
          w-full flex items-center justify-between gap-4 px-6 py-4 sm:py-5
          text-left transition-all duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900
          ${isOpen
            ? 'bg-primary-50/80 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800/50'
            : 'bg-white dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-800'
          }
        `}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span
              className={`
                flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors duration-200
                ${isOpen
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }
              `}
            >
              {icon}
            </span>
          )}
          <span
            className={`
              text-lg font-semibold tracking-tight transition-colors duration-200 truncate
              ${isOpen
                ? 'text-primary-800 dark:text-primary-200'
                : 'text-gray-800 dark:text-gray-200'
              }
            `}
          >
            {title}
          </span>
        </div>
        <span
          className={`
            flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-300 ease-out
            ${isOpen
              ? 'bg-primary-500 text-white rotate-180'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }
          `}
        >
          <HiChevronDown className="w-5 h-5" />
        </span>
      </button>

      {isOpen && (
        <div className="p-6 sm:p-7 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700/50 animate-in slide-in-from-top-1 fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
