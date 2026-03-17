/**
 * Read-only receipt view for the dashboard. Same content as the document layout
 * (BILL TO, receipt details, SERVICES, scope summary, terms, payment footer)
 * but rendered in-page with dashboard styling — not a print/letter layout.
 */

import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';

function formatDocDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ReceiptViewContent({
  document: doc = {},
  company = {},
  client = {},
  currency = 'USD',
  showHeader = true,
  lineItemsSectionLabel = 'Services',
  dateFormat = 'MMMM d, yyyy',
  timezone = 'UTC',
}) {
  const lineItems = Array.isArray(doc.lineItems) ? doc.lineItems : [];
  const subtotal = Number(doc.subtotal) || 0;
  const taxNum = Number(doc.tax) || 0;
  const discountNum = Number(doc.discount) || 0;
  const total = Number(doc.total) ?? subtotal - discountNum + taxNum;
  const amountDue = doc.amountDue != null ? Number(doc.amountDue) : total;
  const amountPaid = total - amountDue;
  const isFullyPaid = amountDue === 0;
  const addressLines = Array.isArray(company.addressLines) ? company.addressLines : (company.address ? [company.address] : []);

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
    if (Number.isNaN(n)) return '—';
    return formatCurrency(n, currency);
  };

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {isFullyPaid && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10"
          aria-hidden
        >
          <span
            className="text-6xl sm:text-8xl font-bold text-rose-400/30 dark:text-rose-500/25"
            style={{ transform: 'rotate(-18deg)' }}
          >
            PAID
          </span>
        </div>
      )}
      <div className="relative z-0">
      {/* Header: company + Receipt title */}
      {showHeader && (
        <header className="flex flex-wrap justify-between items-start gap-4 p-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
          <div className="min-w-0 flex-1 max-w-md">
            {company.logoUrl && (
              <div className="mb-2">
                <img src={company.logoUrl} alt="" className="max-h-9 max-w-[10rem] object-contain" />
              </div>
            )}
            <div className="font-bold text-gray-900 dark:text-white">{company.name || 'Company'}</div>
            {addressLines.filter(Boolean).length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                {addressLines.filter(Boolean).join(', ')}
              </div>
            )}
            {company.phone && <div className="text-sm text-gray-600 dark:text-gray-300">{company.phone}</div>}
            {company.website && <div className="text-sm text-gray-600 dark:text-gray-300">{company.website}</div>}
          </div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-gray-800 dark:text-gray-200 shrink-0">
            Receipt
          </h1>
        </header>
      )}

      <div className="p-6 space-y-6">
        {/* BILL TO + receipt details */}
        <div className="flex flex-wrap justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Bill to
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">{client.name || '—'}</div>
            {client.email && (
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{client.email}</div>
            )}
          </div>
          <div className="text-right shrink-0 space-y-1">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Receipt number: </span>
              <span className="font-semibold text-gray-900 dark:text-white">{doc.number || '—'}</span>
            </div>
            {doc.dateIssued && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Receipt date: </span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatDocDate(doc.dateIssued)}</span>
              </div>
            )}
            {doc.dueDate && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Payment due: </span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatDocDate(doc.dueDate)}</span>
              </div>
            )}
            {amountPaid > 0 && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Amount paid ({currency}): </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(amountPaid)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Services table */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            {lineItemsSectionLabel}
          </div>
          <div className="border-b border-dashed border-gray-300 dark:border-gray-500 mb-2" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dashed border-gray-300 dark:border-gray-500">
                  <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-white w-[40%]">Item</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white w-[15%]">Quantity</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white w-[22%]">Price</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white w-[23%]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((row, i) => (
                  <tr key={i} className="border-b border-dotted border-gray-200 dark:border-gray-600">
                    <td className="py-2 px-2 text-gray-900 dark:text-white">
                      <div>{row.item_name || '—'}</div>
                      {row.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{row.description}</div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">
                      {row.quantity != null ? row.quantity : '—'}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">
                      {formatMoney(row.unit_price)}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">
                      {formatMoney(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-b border-dotted border-gray-200 dark:border-gray-600 my-3" />
          <div className="flex flex-col items-end gap-1 text-sm">
            <div><strong>Subtotal:</strong> {formatMoney(subtotal)}</div>
            <div><strong>Discount:</strong> {formatMoney(discountNum)}</div>
            <div><strong>Tax/VAT:</strong> {formatMoney(taxNum)}</div>
            <div className="font-bold text-base mt-2">Total: {formatMoney(total)}</div>
          </div>
        </div>

        {/* Scope summary */}
        {doc.scopeSummary && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Scope summary
            </div>
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{doc.scopeSummary}</div>
          </div>
        )}

        {/* Terms */}
        {doc.terms && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Terms
            </div>
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{doc.terms}</div>
          </div>
        )}

        {/* Payment footer */}
        {(doc.paidDate != null || amountDue === 0 || amountPaid > 0) && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600 text-right text-sm text-gray-500 dark:text-gray-400 space-y-1">
            {doc.paidDate && (
              <div>Payment on {formatDateFromISO(doc.paidDate, dateFormat, timezone)}</div>
            )}
            <div>Remaining balance: {formatMoney(amountDue)}</div>
            {amountDue === 0 && <div>Amount due: {formatMoney(0)}</div>}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
