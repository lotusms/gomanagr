import Link from 'next/link';
import { HiX } from 'react-icons/hi';

export default function DashboardTodos({ items = [], onDismiss }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">To do</h2>
      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.Icon;
          const content = (
            <div className="flex items-center gap-4 w-full">
              <div className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0 text-gray-600">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
              </div>
              <span className="flex-shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDismiss?.(item.id);
                  }}
                  className="p-1 hover:text-gray-600 hover:bg-gray-100 transition-colors text-gray-600 border border-gray-300 rounded-full px-2 py-1 inline-flex items-center gap-2 text-xs"
                  aria-label="Dismiss"
                  title="Dismiss"
                >
                  Dismiss <HiX className="size-3" />
                </button>
              </span>
            </div>
          );
          const cardClass =
            'bg-white rounded-lg shadow border border-gray-200 p-4 flex items-start gap-4 relative';
          return item.href ? (
            <Link
              key={item.id}
              href={item.href}
              className={`${cardClass} hover:border-primary-200 hover:shadow-md transition-all`}
            >
              {content}
            </Link>
          ) : (
            <div key={item.id} className={cardClass}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
