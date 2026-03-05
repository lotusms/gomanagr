/**
 * Payment summary block for the invoice view (edit page): amounts (total, amount paid, balance due),
 * paid date when applicable, payment history timeline, and actions (Send, Reminder, Void/Refund).
 * Draft and Invoice ID are shown in the form (Step 1) below, not duplicated here.
 * Balance due remains the amount owed until payment processing updates it.
 */

import { useState } from 'react';
import {
  HiCheckCircle,
  HiClock,
  HiMail,
  HiRefresh,
  HiBan,
  HiChevronDown,
  HiChevronUp,
  HiDocument,
} from 'react-icons/hi';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { formatCurrency } from '@/utils/formatCurrency';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import SendInvoiceDialog from './SendInvoiceDialog';

function parseNum(v) {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export default function InvoicePaymentSummary({
  invoice,
  defaultCurrency = 'USD',
  clientEmail = '',
  clientName = '',
  onInvoiceUpdated,
  organizationId = null,
  userId,
}) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendDialogReminder, setSendDialogReminder] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const status = (invoice?.status || 'draft').toLowerCase();
  const total = parseNum(invoice?.total ?? invoice?.amount);
  // Until payment processing sets outstanding_balance, empty means "balance still due" (nothing paid yet)
  const rawBalance = invoice?.outstanding_balance;
  const hasBalanceSet = rawBalance != null && String(rawBalance).trim() !== '';
  const balanceDue = hasBalanceSet ? parseNum(rawBalance) : total;
  const amountPaid = total - balanceDue;
  const paidDate = invoice?.paid_date || null;
  const everSent = Boolean(invoice?.ever_sent);
  const dateSent = invoice?.date_sent || null;
  const createdAt = invoice?.created_at || null;

  const paymentHistoryEvents = [];
  if (createdAt) {
    paymentHistoryEvents.push({ key: 'created', label: 'Created', date: createdAt.slice(0, 10), icon: HiDocument });
  }
  if (everSent && dateSent) {
    paymentHistoryEvents.push({ key: 'sent', label: 'Sent to client', date: dateSent, icon: HiMail });
  }
  if (paidDate && (status === 'paid' || status === 'partially_paid')) {
    paymentHistoryEvents.push({ key: 'paid', label: 'Paid', date: paidDate, icon: HiCheckCircle });
  }
  if (status === 'void') {
    paymentHistoryEvents.push({ key: 'void', label: 'Voided', date: null, icon: HiBan });
  }
  paymentHistoryEvents.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  const handleSendSuccess = () => {
    setSendDialogOpen(false);
    setSendDialogReminder(false);
    onInvoiceUpdated?.();
  };

  const handleVoidConfirm = async () => {
    if (!userId || !invoice?.id) return;
    try {
      const res = await fetch('/api/update-client-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          invoiceId: invoice.id,
          organizationId: organizationId || undefined,
          status: 'void',
          outstanding_balance: '0',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to void invoice');
      }
      setVoidDialogOpen(false);
      onInvoiceUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  const canSend = status !== 'void' && status !== 'paid';
  const canVoid = status !== 'void';

  const cardTheme =
    status === 'overdue'
      ? 'border-2 border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-900/15'
      : status === 'paid' || status === 'partially_paid'
        ? 'border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-900/15'
        : status === 'void'
          ? 'border-2 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-800/60'
          : 'border-2 border-blue-200 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-900/15';

  return (
    <>
      <div className={`rounded-2xl shadow-sm overflow-hidden ${cardTheme}`}>
        <div className="p-5 sm:p-6">
          <div className="mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(total, defaultCurrency)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Amount paid</p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {amountPaid > 0 ? formatCurrency(amountPaid, defaultCurrency) : '—'}
                </p>
                {amountPaid === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Updated when payment is recorded</p>
                )}
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Balance due</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(balanceDue, defaultCurrency)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Amount owed until payment is recorded</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Date paid</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {paidDate ? formatDateFromISO(paidDate, dateFormat, timezone) : '—'}
                </p>
                {!paidDate && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Blank until payment is recorded</p>
                )}
              </div>
            </div>
          </div>

          {paymentHistoryEvents.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setHistoryExpanded((e) => !e)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <HiClock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                Payment history
                {historyExpanded ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
              </button>
              {historyExpanded && (
                <ul className="mt-3 space-y-2 pl-6 border-l-2 border-gray-200 dark:border-gray-600 ml-1">
                  {paymentHistoryEvents.map((ev) => {
                    const Icon = ev.icon;
                    return (
                      <li key={ev.key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Icon className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                        <span>{ev.label}</span>
                        {ev.date && (
                          <time dateTime={ev.date} className="text-gray-500 dark:text-gray-500">
                            {formatDateFromISO(ev.date, dateFormat, timezone)}
                          </time>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
            {canVoid && (
              <SecondaryButton
                type="button"
                className="gap-2 px-4 py-1.5 min-w-0 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => setVoidDialogOpen(true)}
              >
                <HiBan className="w-4 h-4" />
                Void / Refund
              </SecondaryButton>
            )}
            {canSend && (
              <>
                {everSent && (
                  <SecondaryButton
                    type="button"
                    className="gap-2 px-4 py-1.5 min-w-0 text-sm"
                    onClick={() => { setSendDialogReminder(true); setSendDialogOpen(true); }}
                  >
                    <HiRefresh className="w-4 h-4" />
                    Send reminder
                  </SecondaryButton>
                )}
                <PrimaryButton
                  type="button"
                  className="gap-2 px-4 py-1.5 min-w-0 text-sm"
                  onClick={() => { setSendDialogReminder(false); setSendDialogOpen(true); }}
                >
                  <HiMail className="w-4 h-4" />
                  {everSent ? 'Resend invoice' : 'Send invoice'}
                </PrimaryButton>
              </>
            )}
          </div>
        </div>
      </div>

      <SendInvoiceDialog
        isOpen={sendDialogOpen}
        onClose={() => { setSendDialogOpen(false); setSendDialogReminder(false); }}
        onSuccess={handleSendSuccess}
        invoiceId={invoice?.id}
        invoiceTitle={invoice?.invoice_title}
        invoiceNumber={invoice?.invoice_number}
        defaultTo={clientEmail}
        clientName={clientName}
        userId={userId}
        organizationId={organizationId}
        isReminder={sendDialogReminder}
      />

      <ConfirmationDialog
        isOpen={voidDialogOpen}
        onClose={() => setVoidDialogOpen(false)}
        onConfirm={handleVoidConfirm}
        title="Void invoice"
        message="This will mark the invoice as void. The balance due will be set to zero. This action cannot be undone."
        confirmText="Void invoice"
        cancelText="Cancel"
        confirmationWord="void"
        variant="danger"
      />
    </>
  );
}
