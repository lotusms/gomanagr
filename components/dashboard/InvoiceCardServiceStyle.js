import { useState } from 'react';
import { HiDocumentText, HiTrash, HiEye, HiPrinter } from 'react-icons/hi';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { formatCurrency } from '@/utils/formatCurrency';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';
import { DocumentViewDialog } from '@/components/documents';
import { buildInvoiceDocumentPayload, buildCompanyForDocument } from '@/lib/buildDocumentPayload';

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  overdue: 'Overdue',
  paid: 'Paid',
  partially_paid: 'Partially paid',
  void: 'Void',
};

/**
 * Single invoice card in the same visual style as the services page:
 * gradient header with icon + title + delete, content area with details.
 * Used only on the dashboard Invoices page (not in client Documents & Files).
 */
export default function InvoiceCardServiceStyle({
  invoice,
  onSelect,
  onDelete,
  clientNameByClientId = {},
  defaultCurrency = 'USD',
  organization = null,
}) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';

  const [viewState, setViewState] = useState({ open: false, autoPrint: false });
  const clientName = invoice.client_id && clientNameByClientId[invoice.client_id];
  const statusLabel = invoice.status ? (STATUS_LABELS[invoice.status] || invoice.status) : null;
  const total = invoice.total || invoice.amount;
  const company = buildCompanyForDocument(account, organization);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(invoice.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(invoice.id);
        }
      }}
      className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-600 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Header with gradient background (primary) */}
      <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <HiDocumentText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">
                {invoice.invoice_title || 'Untitled invoice'}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setViewState({ open: true, autoPrint: false });
              }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              title="View invoice"
            >
              <HiEye className="size-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setViewState({ open: true, autoPrint: true });
              }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              title="Print invoice"
            >
              <HiPrinter className="size-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(invoice.id);
              }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              title="Delete invoice"
            >
              <HiTrash className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
          {clientName && (
            <span className="font-medium text-gray-700 dark:text-gray-300">{clientName}</span>
          )}
          {invoice.invoice_number && <span>{invoice.invoice_number}</span>}
          {statusLabel && (
            <span className="font-medium px-2 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
              {statusLabel}
            </span>
          )}
          {invoice.date_issued && (
            <time dateTime={invoice.date_issued}>
              {formatDateFromISO(invoice.date_issued, dateFormat, timezone)}
            </time>
          )}
        </div>

        {total != null && total !== '' && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Total: {formatCurrency(total, defaultCurrency)}
          </p>
        )}

        {invoice.outstanding_balance != null && invoice.outstanding_balance !== '' && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Outstanding: {formatCurrency(invoice.outstanding_balance, defaultCurrency)}
          </p>
        )}

        {!total && !invoice.outstanding_balance && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No amount</p>
        )}
      </div>
      {viewState.open && (
        <DocumentViewDialog
          isOpen={viewState.open}
          onClose={() => setViewState({ open: false, autoPrint: false })}
          type="invoice"
          document={buildInvoiceDocumentPayload(invoice)}
          company={company}
          client={{ name: clientName || 'Client', email: '' }}
          currency={defaultCurrency}
          autoPrint={viewState.autoPrint}
        />
      )}
    </div>
  );
}
