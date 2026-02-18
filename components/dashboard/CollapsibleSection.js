import { HiChevronDown, HiChevronRight } from 'react-icons/hi';

/**
 * Collapsible Section Component for accordion-style UI
 */
export default function CollapsibleSection({ title, isOpen, onToggle, children }) {
  return (
    <div className="group border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-800/50 backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggle}
        className={`
          w-full flex items-center justify-between px-5 py-4 
          text-left transition-all duration-200 ease-out
          ${isOpen 
            ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 border-b border-primary-200 dark:border-primary-800' 
            : 'bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/30 hover:from-gray-100 hover:to-gray-150 dark:hover:from-gray-700/50 dark:hover:to-gray-600/30'
          }
        `}
      >
        <span className={`
          text-base font-semibold transition-colors duration-200
          ${isOpen 
            ? 'text-primary-700 dark:text-primary-300' 
            : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100'
          }
        `}>
          {title}
        </span>
        <div className={`
          flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
          ${isOpen 
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rotate-180' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
          }
        `}>
          {isOpen ? (
            <HiChevronDown className="w-5 h-5 transition-transform duration-200" />
          ) : (
            <HiChevronRight className="w-5 h-5 transition-transform duration-200" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="p-6 space-y-4 bg-white dark:bg-gray-800/30 animate-in slide-in-from-top-2 fade-in-50 duration-300">
          {children}
        </div>
      )}
    </div>
  );
}
