import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiCurrencyDollar, HiTrash, HiEye, HiPrinter, HiMail, HiRefresh, HiBan, HiDotsVertical } from 'react-icons/hi';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { formatCurrency } from '@/utils/formatCurrency';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';
import { DocumentViewDialog } from '@/components/documents';
import { buildInvoiceDocumentPayload, buildCompanyForDocument } from '@/lib/buildDocumentPayload';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import SendInvoiceDialog from '@/components/invoices/SendInvoiceDialog';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  overdue: 'Overdue',
  paid: 'Paid',
  partially_paid: 'Partially paid',
  void: 'Void',
};

function parseNum(v) {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Single invoice card in the same visual style as the services page:
 * gradient header with icon + title + actions, content area with payment details.
 * Used only on the dashboard Invoices page (not in client Documents & Files).
 */
export default function InvoiceCardServiceStyle({
  invoice,
  onSelect,
  onDelete,
  onInvoiceUpdated,
  clientNameByClientId = {},
  clientEmailByClientId = {},
  defaultCurrency = 'USD',
  organization = null,
  userId = null,
  accountIndustry = null,
}) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';
  const industry = accountIndustry ?? organization?.industry ?? account?.industry;
  const lineItemsSectionLabel = getTermForIndustry(industry, 'services');
  const invoiceTermPlural = getTermForIndustry(industry, 'invoice');
  const invoiceTermSingular = getTermSingular(invoiceTermPlural) || 'Invoice';
  const invoiceTermSingularLower = invoiceTermSingular.toLowerCase();
  const untitledInvoiceLabel = `Untitled ${invoiceTermSingularLower}`;

  const [viewState, setViewState] = useState({ open: false, autoPrint: false });
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendDialogReminder, setSendDialogReminder] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const menuButtonRef = useRef(null);
  const menuContentRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      const inTrigger = menuButtonRef.current?.contains(e.target);
      const inMenu = menuContentRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const clientName = invoice.client_id && clientNameByClientId[invoice.client_id];
  const clientEmail = invoice.client_id && clientEmailByClientId[invoice.client_id];
  const statusLabel =
    invoice.status && invoice.status !== 'paid' && invoice.status !== 'partially_paid'
      ? (STATUS_LABELS[invoice.status] || invoice.status)
      : null;
  const total = parseNum(invoice.total ?? invoice.amount);
  const rawBalance = invoice.outstanding_balance;
  const hasBalanceSet = rawBalance != null && String(rawBalance).trim() !== '';
  const balanceDue = hasBalanceSet ? parseNum(rawBalance) : total;
  const amountPaid = total - balanceDue;
  const paidDate = invoice.paid_date || null;
  const everSent = Boolean(invoice.ever_sent);
  const company = buildCompanyForDocument(account, organization);

  const canSend = invoice.status !== 'void' && invoice.status !== 'paid';
  const canVoid = invoice.status !== 'void';

  // Header color by status: paid=green, overdue=red, partially_paid=amber, draft=slate, sent=primary, void=gray
  const statusForHeader = (invoice.status || 'draft').toLowerCase();
  const headerGradient =
    statusForHeader === 'paid'
      ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700'
      : statusForHeader === 'overdue'
        ? 'bg-gradient-to-br from-red-500 via-red-600 to-red-700'
        : statusForHeader === 'partially_paid'
          ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700'
          : statusForHeader === 'draft'
            ? 'bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700'
            : statusForHeader === 'void'
              ? 'bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700'
              : 'bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700';

  const openEdit = () => onSelect(invoice.id);

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
          organizationId: organization?.id ?? undefined,
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

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-600 transition-all duration-300 flex flex-col">
      {/* Header with gradient by status: paid=green, overdue=red, partially_paid=amber, draft=slate, sent=primary */}
      <div className={`relative ${headerGradient} px-5 py-4`}>
        <div className="flex items-center justify-between gap-2">
          <div
            role="button"
            tabIndex={0}
            onClick={openEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEdit();
              }
            }}
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <HiCurrencyDollar className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">
                {invoice.invoice_title || untitledInvoiceLabel}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(invoice.id); }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              title={`Delete ${invoiceTermSingularLower}`}
            >
              <HiTrash className="size-5" />
            </button>
            <div className="relative">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = menuButtonRef.current?.getBoundingClientRect();
                  if (rect) setMenuAnchorRect(rect);
                  setMenuOpen((o) => !o);
                }}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                title="More actions"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <HiDotsVertical className="size-5" />
              </button>
              {menuOpen && menuAnchorRect && createPortal(
                <div
                  ref={menuContentRef}
                  role="menu"
                  className="fixed z-50 min-w-[10rem] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-1 shadow-lg"
                  style={{
                    top: menuAnchorRect.bottom + 4,
                    right: typeof window !== 'undefined' ? window.innerWidth - menuAnchorRect.right : 0,
                  }}
                >
                  {canSend && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setSendDialogReminder(false); setSendDialogOpen(true); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <HiMail className="w-4 h-4 flex-shrink-0" />
                        {everSent ? `Resend ${invoiceTermSingularLower}` : `Send ${invoiceTermSingularLower}`}
                      </button>
                      {everSent && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setSendDialogReminder(true); setSendDialogOpen(true); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <HiRefresh className="w-4 h-4 flex-shrink-0" />
                          Send reminder
                        </button>
                      )}
                    </>
                  )}
                  {canVoid && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setVoidDialogOpen(true); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <HiBan className="w-4 h-4 flex-shrink-0" />
                      Void / Refund
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setViewState({ open: true, autoPrint: false }); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <HiEye className="w-4 h-4 flex-shrink-0" />
                    View {invoiceTermSingularLower}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setViewState({ open: true, autoPrint: true }); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <HiPrinter className="w-4 h-4 flex-shrink-0" />
                    Print {invoiceTermSingularLower}
                  </button>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content area - click opens edit */}
      <div
        role="button"
        tabIndex={0}
        onClick={openEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openEdit();
          }
        }}
        className="p-5 flex-1 flex flex-col cursor-pointer"
      >
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

        <div className="space-y-1 text-sm">
          {total > 0 && (
            <p className="text-gray-600 dark:text-gray-400">
              Total: {formatCurrency(total, defaultCurrency)}
            </p>
          )}
          {amountPaid > 0 && (
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">
              Amount paid: {formatCurrency(amountPaid, defaultCurrency)}
            </p>
          )}
          {balanceDue > 0 && (
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              Balance due: {formatCurrency(balanceDue, defaultCurrency)}
            </p>
          )}
          {paidDate && (
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              {formatDateFromISO(paidDate, dateFormat, timezone)}
            </p>
          )}
          {total === 0 && amountPaid === 0 && balanceDue === 0 && (
            <p className="text-gray-400 dark:text-gray-500 italic">No amount</p>
          )}
        </div>
      </div>
      <SendInvoiceDialog
        isOpen={sendDialogOpen}
        onClose={() => { setSendDialogOpen(false); setSendDialogReminder(false); }}
        onSuccess={handleSendSuccess}
        invoiceId={invoice.id}
        invoiceTitle={invoice.invoice_title}
        invoiceNumber={invoice.invoice_number}
        defaultTo={clientEmail}
        clientName={clientName}
        userId={userId}
        organizationId={organization?.id ?? null}
        isReminder={sendDialogReminder}
      />
      <ConfirmationDialog
        isOpen={voidDialogOpen}
        onClose={() => setVoidDialogOpen(false)}
        onConfirm={handleVoidConfirm}
        title={`Void ${invoiceTermSingular}`}
        message={`This will mark the ${invoiceTermSingularLower} as void and set balance due to zero. This cannot be undone.`}
        confirmText={`Void ${invoiceTermSingularLower}`}
        cancelText="Cancel"
        confirmationWord="void"
        variant="danger"
      />
      {viewState.open && (
        <DocumentViewDialog
          isOpen={viewState.open}
          onClose={() => setViewState({ open: false, autoPrint: false })}
          type="invoice"
          documentTypeLabel={invoiceTermSingular}
          document={buildInvoiceDocumentPayload(invoice)}
          company={company}
          client={{ name: clientName || 'Client', email: '' }}
          currency={defaultCurrency}
          autoPrint={viewState.autoPrint}
          lineItemsSectionLabel={lineItemsSectionLabel}
        />
      )}
    </div>
  );
}
