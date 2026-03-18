/**
 * Payment summary block for the invoice view (edit page): amounts (total, amount paid, balance due),
 * paid date when applicable, payment history timeline, and actions (Send, Reminder, Void/Refund).
 * Draft and Invoice ID are shown in the form (Step 1) below, not duplicated here.
 * Balance due remains the amount owed until payment processing updates it.
 */

import { useState, useEffect } from 'react';
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
import * as Dialog from '@radix-ui/react-dialog';
import { HiX } from 'react-icons/hi';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import SendInvoiceDialog from './SendInvoiceDialog';
import InputField from '@/components/ui/InputField';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

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
  industry,
}) {
  const account = useOptionalUserAccount();
  const invoiceTermPlural = getTermForIndustry(industry ?? account?.industry, 'invoice');
  const invoiceTermSingular = getTermSingular(invoiceTermPlural) || 'Invoice';
  const invoiceTermSingularLower = invoiceTermSingular.toLowerCase();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendDialogReminder, setSendDialogReminder] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [correctBalanceDialogOpen, setCorrectBalanceDialogOpen] = useState(false);
  const [correctBalanceValue, setCorrectBalanceValue] = useState('');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptEmail, setReceiptEmail] = useState('');
  const [receiptSending, setReceiptSending] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [paymentHistoryList, setPaymentHistoryList] = useState([]);

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

  // Fetch stored payment timeline when invoice is paid or partially paid.
  useEffect(() => {
    if (!invoice?.id || !userId || (status !== 'paid' && status !== 'partially_paid')) {
      setPaymentHistoryList([]);
      return;
    }
    fetch('/api/get-invoice-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        organizationId: organizationId || undefined,
        invoiceId: invoice.id,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPaymentHistoryList(Array.isArray(data?.payments) ? data.payments : []))
      .catch(() => setPaymentHistoryList([]));
  }, [invoice?.id, userId, organizationId, status]);

  const paymentHistoryEvents = [];
  if (createdAt) {
    paymentHistoryEvents.push({ key: 'created', label: 'Created', date: createdAt.slice(0, 10), sortOrder: 0, icon: HiDocument });
  }
  if (everSent && dateSent) {
    paymentHistoryEvents.push({ key: 'sent', label: 'Sent to client', date: dateSent, sortOrder: 1, icon: HiMail });
  }
  if (status === 'paid' || status === 'partially_paid') {
    if (paymentHistoryList.length > 0) {
      paymentHistoryList.forEach((p, i) => {
        const dateStr = p.paid_at ? (p.paid_at.slice && p.paid_at.slice(0, 10)) || p.paid_at : paidDate;
        const amount = (p.amount_cents ?? 0) / 100;
        const currency = (p.currency || defaultCurrency || 'USD').toUpperCase();
        paymentHistoryEvents.push({
          key: `paid-${p.id || i}`,
          label: `Paid ${formatCurrency(amount, currency)}`,
          date: dateStr,
          sortOrder: 2,
          icon: HiCheckCircle,
        });
      });
    } else if (paidDate) {
      const currency = (defaultCurrency || 'USD').toUpperCase();
      const paidLabel = amountPaid > 0 ? `Paid ${formatCurrency(amountPaid, currency)}` : 'Paid';
      paymentHistoryEvents.push({ key: 'paid', label: paidLabel, date: paidDate, sortOrder: 2, icon: HiCheckCircle });
    }
  }
  if (status === 'void') {
    paymentHistoryEvents.push({ key: 'void', label: 'Voided', date: null, sortOrder: 9, icon: HiBan });
  }
  paymentHistoryEvents.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.sortOrder ?? 5) - (b.sortOrder ?? 5);
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
        throw new Error(data.error || `Failed to void ${invoiceTermSingularLower}`);
      }
      setVoidDialogOpen(false);
      onInvoiceUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (correctBalanceDialogOpen) {
      setCorrectBalanceValue(balanceDue === total ? String(total) : String(balanceDue));
    }
  }, [correctBalanceDialogOpen, balanceDue, total]);

  const handleCorrectBalanceApply = async () => {
    if (!userId || !invoice?.id) return;
    const num = parseNum(correctBalanceValue);
    if (num < 0 || num > total) return;
    try {
      const res = await fetch('/api/undo-invoice-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          invoiceId: invoice.id,
          organizationId: organizationId || undefined,
          balanceDue: num,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update balance');
      }
      setCorrectBalanceDialogOpen(false);
      onInvoiceUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  const canCorrectBalance = everSent && status !== 'void' && total > 0;

  const canSend = status !== 'void';
  const isFullyPaid = status === 'paid';
  const isPartiallyPaidOrPaid = status === 'partially_paid' || status === 'paid';
  const canVoid = status !== 'void';

  useEffect(() => {
    if (receiptDialogOpen) {
      setReceiptEmail(clientEmail || '');
      setReceiptError('');
    }
  }, [receiptDialogOpen, clientEmail]);

  const handleSendReceipt = async () => {
    const to = (receiptEmail || '').trim();
    if (!to) {
      setReceiptError('Enter the recipient email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setReceiptError('Enter a valid email address.');
      return;
    }
    if (!userId || !invoice?.id) return;
    setReceiptError('');
    setReceiptSending(true);
    try {
      const res = await fetch('/api/send-receipt-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId: organizationId || undefined,
          invoiceId: invoice.id,
          to,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send receipt');
      setReceiptDialogOpen(false);
      onInvoiceUpdated?.();
    } catch (err) {
      setReceiptError(err.message || 'Failed to send receipt');
    } finally {
      setReceiptSending(false);
    }
  };

  // Paid: light green bg + darker green border (like receipt/success). Partially paid: amber. Overdue: red. Draft/sent: blue. Void: gray.
  const cardTheme =
    status === 'overdue'
      ? 'border-2 border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-900/15'
      : status === 'paid'
        ? 'border-2 border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/25'
        : status === 'partially_paid'
          ? 'border-2 border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20'
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
            {canCorrectBalance && (
              <SecondaryButton
                type="button"
                className="gap-2 px-4 py-1.5 min-w-0 text-sm"
                onClick={() => setCorrectBalanceDialogOpen(true)}
              >
                Correct balance due
              </SecondaryButton>
            )}
            {canSend && !isFullyPaid && (
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
                  Send {invoiceTermSingularLower}
                </PrimaryButton>
              </>
            )}
            {isPartiallyPaidOrPaid && (
              <PrimaryButton
                type="button"
                className="gap-2 px-4 py-1.5 min-w-0 text-sm"
                onClick={() => setReceiptDialogOpen(true)}
              >
                <HiMail className="w-4 h-4" />
                Email receipt
              </PrimaryButton>
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
        title={`Void ${invoiceTermSingularLower}`}
        message={`This will mark the ${invoiceTermSingularLower} as void. The balance due will be set to zero. This action cannot be undone.`}
        confirmText={`Void ${invoiceTermSingularLower}`}
        cancelText="Cancel"
        confirmationWord="void"
        variant="danger"
      />

      <Dialog.Root open={correctBalanceDialogOpen} onOpenChange={(open) => !open && setCorrectBalanceDialogOpen(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] data-[state=open]:animate-[fadeIn_150ms_ease-out] data-[state=closed]:animate-[fadeOut_150ms_ease-out]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[201] w-full max-w-md p-0 focus:outline-none overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                  Correct balance due
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button type="button" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
                    <HiX className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Set the balance due to match what was actually paid (e.g. after undoing an incorrect payment but a real payment remains). Total: {formatCurrency(total, defaultCurrency)}.
              </Dialog.Description>
              <InputField
                id="correct-balance-due"
                label="Balance due"
                value={correctBalanceValue}
                onChange={(e) => setCorrectBalanceValue(e.target.value)}
                variant="light"
                inputProps={{
                  type: 'number',
                  min: 0,
                  max: total,
                  step: 0.01,
                  'aria-describedby': 'correct-balance-hint',
                }}
              />
              <p id="correct-balance-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter 0 to mark as fully paid. Max: {formatCurrency(total, defaultCurrency)}.
              </p>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
              <SecondaryButton type="button" onClick={() => setCorrectBalanceDialogOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={handleCorrectBalanceApply}
                disabled={parseNum(correctBalanceValue) < 0 || parseNum(correctBalanceValue) > total}
              >
                Apply
              </PrimaryButton>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={receiptDialogOpen} onOpenChange={(open) => !open && setReceiptDialogOpen(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] data-[state=open]:animate-[fadeIn_150ms_ease-out] data-[state=closed]:animate-[fadeOut_150ms_ease-out]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[201] w-full max-w-md p-0 focus:outline-none overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                  Email receipt
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button type="button" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
                    <HiX className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Send a receipt for the payment(s) on this {invoiceTermSingularLower} to the client.
              </Dialog.Description>
              <InputField
                id="receipt-email"
                label="Recipient email"
                value={receiptEmail}
                onChange={(e) => { setReceiptEmail(e.target.value); setReceiptError(''); }}
                variant="light"
                inputProps={{ type: 'email', autoComplete: 'email' }}
                error={receiptError}
              />
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
              <SecondaryButton type="button" onClick={() => setReceiptDialogOpen(false)} disabled={receiptSending}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="button" onClick={handleSendReceipt} disabled={receiptSending}>
                {receiptSending ? 'Sending…' : 'Send receipt'}
              </PrimaryButton>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
