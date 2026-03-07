'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HiRefresh, HiDocumentText, HiCurrencyDollar, HiChevronLeft, HiChevronRight } from 'react-icons/hi';

const PAGE_SIZE = 5;

/**
 * Timeline of recent changes (5 per page): "Invoice INV-… marked paid", "Proposal PROP-… created", etc.
 */
export default function RecentlyUpdatedCard({ items = [], dateFormat = 'MM/DD/YYYY', timezone = 'UTC' }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const visibleItems = items.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
            <HiRefresh className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recently updated</h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
          <HiRefresh className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recently updated</h3>
      </div>
      <div className="px-5 py-4">
        <ul className="relative space-y-0">
          <div
            className="absolute left-[9px] top-1.5 bottom-1.5 w-px bg-gray-200 dark:bg-gray-600"
            aria-hidden
          />
          {visibleItems.map((item) => (
            <li key={item.id} className="relative flex gap-2 pb-1.5 last:pb-0">
              <div className="relative z-10 flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mt-0.5">
                {item.type === 'invoice' ? (
                  <HiCurrencyDollar className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                ) : (
                  <HiDocumentText className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0">
                <Link
                  href={
                    item.type === 'invoice'
                      ? `/dashboard/invoices/${item.resourceId}/edit`
                      : `/dashboard/proposals/${item.resourceId}/edit`
                  }
                  className="text-xs font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors leading-tight"
                >
                  {item.description}
                </Link>
                {item.clientName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">
                    {item.clientName}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
                  {formatRelative(item.updatedAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {totalPages > 1 && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Previous page"
            >
              <HiChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {start + 1}–{Math.min(start + PAGE_SIZE, items.length)} of {items.length}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Next page"
            >
              Next
              <HiChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}
