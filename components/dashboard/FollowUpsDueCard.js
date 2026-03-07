'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HiPhone, HiMail, HiCheck, HiClipboardList, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { formatDate } from '@/utils/dateTimeFormatters';

const PAGE_SIZE = 5;

/**
 * Action-focused card: list of follow-up items (client + reason, due date, quick actions), 5 per page with pagination.
 * Quick actions: Log call (client profile), Send email (client profile), Mark done (edit resource).
 */
export default function FollowUpsDueCard({
  items = [],
  dateFormat = 'MM/DD/YYYY',
  timezone = 'UTC',
  emptyMessage = 'No follow-ups due',
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const visibleItems = items.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <Card title="Follow-ups due" icon={HiClipboardList}>
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <Card title="Follow-ups due" icon={HiClipboardList}>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {visibleItems.map((item) => (
          <li key={item.id} className="py-1.5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
                  {item.clientName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{item.reason}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
                  Due {formatDate(item.dueDate, dateFormat, timezone)}
                  {item.days < 0 && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">
                      (overdue)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Link
                  href={`/dashboard/clients/${encodeURIComponent(item.clientId)}/edit?tab=communication&section=calls`}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  title="Log call"
                  aria-label="Log call"
                >
                  <HiPhone className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/dashboard/clients/${encodeURIComponent(item.clientId)}/edit?tab=communication`}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  title="Send email"
                  aria-label="Send email"
                >
                  <HiMail className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={
                    item.type === 'invoice'
                      ? `/dashboard/invoices/${item.resourceId}/edit`
                      : `/dashboard/proposals/${item.resourceId}/edit`
                  }
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  title="Mark done / Edit"
                  aria-label="Mark done"
                >
                  <HiCheck className="w-3.5 h-3.5" />
                </Link>
              </div>
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
    </Card>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
