import CardDeleteButton from './CardDeleteButton';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  overdue: 'Overdue',
  paid: 'Paid',
  partially_paid: 'Partially paid',
  void: 'Void',
};

export default function InvoiceLogCards({ invoices, onSelect, onDelete, borderClass }) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';

  const baseClass = 'relative w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer pl-4 pr-11 py-3 min-h-[56px]';
  const cardClass = borderClass ? baseClass + ' ' + borderClass : baseClass;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {invoices.map((inv) => (
        <div
          key={inv.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(inv.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(inv.id);
            }
          }}
          className={cardClass}
        >
          <div className="absolute top-1 right-1 flex items-center">
            <CardDeleteButton
              onDelete={() => onDelete(inv.id)}
              title="Delete invoice"
              className="opacity-60 group-hover:opacity-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            {inv.invoice_number && <span>{inv.invoice_number}</span>}
            {inv.status && (
              <span className="font-medium px-2 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                {STATUS_LABELS[inv.status] || inv.status}
              </span>
            )}
            {inv.date_issued && <time dateTime={inv.date_issued}>{formatDateFromISO(inv.date_issued, dateFormat, timezone)}</time>}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-8">{inv.invoice_title || 'Untitled invoice'}</p>
          {(inv.total || inv.amount) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Total: {inv.total || inv.amount}</p>
          )}
          {inv.outstanding_balance && (
            <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding: {inv.outstanding_balance}</p>
          )}
        </div>
      ))}
    </div>
  );
}
