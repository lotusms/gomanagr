'use client';

import Link from 'next/link';
import { HiCurrencyDollar, HiPlus } from 'react-icons/hi';
import { formatCurrency } from '@/utils/formatCurrency';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

function StatBox({ label, value, sublabel, accent }) {
  const isAmber = accent === 'amber';
  return (
    <div
      className={`flex flex-col justify-between rounded-xl min-h-[5.5rem] p-4 border-l-4 ${
        isAmber
          ? 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-400 dark:border-amber-500'
          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div className="mt-2 flex flex-col gap-0.5">
        <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
          {value}
        </span>
        {sublabel && (
          <span
            className={`text-sm font-medium ${
              isAmber ? 'text-amber-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Summary: overdue count + total overdue amount, due in 7/14/30 days counts, "Create invoice" CTA.
 */
export default function InvoicesNeedingAttentionCard({
  overdueCount = 0,
  overdueTotal = 0,
  dueIn7DaysCount = 0,
  dueIn14DaysCount = 0,
  dueIn30DaysCount = 0,
  currency = 'USD',
  accountIndustry = null,
}) {
  const invoiceTermPlural = getTermForIndustry(accountIndustry, 'invoice');
  const invoiceTermSingular = getTermSingular(invoiceTermPlural) || 'Invoice';
  const invoiceTermPluralLower = (invoiceTermPlural || 'invoices').toLowerCase();
  const invoiceTermSingularLower = invoiceTermSingular.toLowerCase();
  const hasAttention =
    overdueCount > 0 || dueIn7DaysCount > 0 || dueIn14DaysCount > 0 || dueIn30DaysCount > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          <HiCurrencyDollar className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {invoiceTermPlural} needing attention
        </h3>
      </div>
      <div className="px-5 py-4 space-y-4">
        {!hasAttention ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No overdue or upcoming {invoiceTermPluralLower}.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatBox
              label="Overdue"
              value={overdueCount}
              sublabel={overdueCount > 0 ? formatCurrency(overdueTotal, currency) : null}
              accent="amber"
            />
            <StatBox
              label="Due in 7 days"
              value={dueIn7DaysCount}
              sublabel={dueIn7DaysCount > 0 ? invoiceTermPluralLower : null}
            />
            <StatBox
              label="Due in 14 days"
              value={dueIn14DaysCount}
              sublabel={dueIn14DaysCount > 0 ? invoiceTermPluralLower : null}
            />
            <StatBox
              label="Due in 30 days"
              value={dueIn30DaysCount}
              sublabel={dueIn30DaysCount > 0 ? invoiceTermPluralLower : null}
            />
          </div>
        )}
        <div className="flex justify-end">
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex items-center gap-2 w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-medium text-sm transition-colors"
          >
            <HiPlus className="w-4 h-4" />
            Create {invoiceTermSingularLower}
          </Link>
        </div>
      </div>
    </div>
  );
}
