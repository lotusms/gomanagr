import Link from 'next/link';
import { HiX } from 'react-icons/hi';

export default function DashboardTodos({ items = [], onDismiss, onItemClick }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">To do</h2>
      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.Icon;
          const content = (
            <div className="flex items-center gap-4 w-full">
              <div className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-gray-400">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>
              </div>
              <span className="flex-shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDismiss?.(item.id);
                  }}
                  className="p-1 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-full px-2 py-1 inline-flex items-center gap-2 text-xs"
                  aria-label="Dismiss"
                  title="Dismiss"
                >
                  Dismiss <HiX className="size-3" />
                </button>
              </span>
            </div>
          );
          const cardClass =
            'bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-4 relative';
          const isClickable = !item.href && typeof onItemClick === 'function';
          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`${cardClass} hover:border-primary-200 dark:hover:border-primary-600 hover:shadow-md transition-all`}
              >
                {content}
              </Link>
            );
          }
          if (isClickable) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item)}
                className={`${cardClass} hover:border-primary-200 dark:hover:border-primary-600 hover:shadow-md transition-all text-left w-full cursor-pointer`}
              >
                {content}
              </button>
            );
          }
          return (
            <div key={item.id} className={cardClass}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
