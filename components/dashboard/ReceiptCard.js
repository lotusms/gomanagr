import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiReceiptRefund, HiEye, HiPrinter, HiMail, HiDotsVertical } from 'react-icons/hi';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { formatCurrency } from '@/utils/formatCurrency';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';
import { DocumentViewDialog } from '@/components/documents';
import { buildInvoiceDocumentPayload, buildCompanyForDocument } from '@/lib/buildDocumentPayload';
import { getTermForIndustry } from '@/components/clients/clientProfileConstants';
import SendInvoiceDialog from '@/components/invoices/SendInvoiceDialog';

function parseNum(v) {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Read-only receipt card: paid invoice displayed as a receipt.
 * Actions: View, Print, Email receipt. No edit or delete.
 */
export default function ReceiptCard({
  invoice,
  onReceiptUpdated,
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
  const invoiceTermSingular = getTermForIndustry(industry, 'invoice')?.replace(/s$/, '') || 'Invoice';
  const invoiceTermSingularLower = invoiceTermSingular.toLowerCase();
  const untitledLabel = `Untitled ${invoiceTermSingularLower}`;

  const [viewState, setViewState] = useState({ open: false, autoPrint: false });
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
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
  const total = parseNum(invoice.total ?? invoice.amount);
  const rawBalance = invoice.outstanding_balance;
  const hasBalanceSet = rawBalance != null && String(rawBalance).trim() !== '';
  const balanceDue = hasBalanceSet ? parseNum(rawBalance) : total;
  const amountPaid = total - balanceDue;
  const paidDate = invoice.paid_date || null;
  const company = buildCompanyForDocument(account, organization);

  const openView = (autoPrint = false) => {
    setViewState({ open: true, autoPrint });
  };

  const handleSendSuccess = () => {
    setSendDialogOpen(false);
    onReceiptUpdated?.();
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-600 transition-all duration-300 flex flex-col">
      <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div
            role="button"
            tabIndex={0}
            onClick={() => openView(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openView(false);
              }
            }}
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <HiReceiptRefund className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">
                {invoice.invoice_title || untitledLabel}
              </h3>
            </div>
          </div>
          <div className="relative flex-shrink-0">
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
              title="Actions"
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
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); openView(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <HiEye className="w-4 h-4 flex-shrink-0" />
                  View receipt
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); openView(true); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <HiPrinter className="w-4 h-4 flex-shrink-0" />
                  Print
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setSendDialogOpen(true); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <HiMail className="w-4 h-4 flex-shrink-0" />
                  Email receipt
                </button>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => openView(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openView(false);
          }
        }}
        className="p-5 flex-1 flex flex-col cursor-pointer"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
          {clientName && (
            <span className="font-medium text-gray-700 dark:text-gray-300">{clientName}</span>
          )}
          {invoice.invoice_number && <span>{invoice.invoice_number}</span>}
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
              Paid: {formatCurrency(amountPaid, defaultCurrency)}
            </p>
          )}
          {paidDate && (
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              Paid {formatDateFromISO(paidDate, dateFormat, timezone)}
            </p>
          )}
        </div>
      </div>

      <SendInvoiceDialog
        isOpen={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        onSuccess={handleSendSuccess}
        invoiceId={invoice.id}
        invoiceTitle={invoice.invoice_title}
        invoiceNumber={invoice.invoice_number}
        defaultTo={clientEmail}
        clientName={clientName}
        userId={userId}
        organizationId={organization?.id ?? null}
        isReminder={false}
      />
      {viewState.open && (
        <DocumentViewDialog
          isOpen={viewState.open}
          onClose={() => setViewState({ open: false, autoPrint: false })}
          type="invoice"
          documentTypeLabel="Receipt"
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
