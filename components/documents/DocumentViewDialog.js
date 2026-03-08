'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { HiX, HiPrinter, HiMinus, HiPlus } from 'react-icons/hi';
import { ProposalInvoiceDocument } from '@/components/documents';
import { PrimaryButton } from '@/components/ui/buttons';

const LETTER_WIDTH_PX = 816;  // 8.5in at 96dpi
const LETTER_HEIGHT_PX = 1056; // 11in at 96dpi
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

/**
 * Dialog that shows a proposal or invoice in the same layout used for email/print.
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {'proposal'|'invoice'} type
 * @param {Object} document - payload for ProposalInvoiceDocument (title, number, lineItems, subtotal, tax, discount, total, etc.)
 * @param {Object} company - { name, logoUrl? }
 * @param {Object} client - { name, email? }
 * @param {string} [currency='USD']
 * @param {boolean} [autoPrint] - when true, triggers print shortly after open
 * @param {string} [lineItemsSectionLabel='Services'] - Section heading for line items (e.g. "Procedures", "Products")
 * @param {string} [documentTypeLabel] - When type is 'proposal', label for the document type (e.g. "Quote", "Estimate") for dialog title and document heading
 */
export default function DocumentViewDialog({
  isOpen,
  onClose,
  type,
  document: doc = {},
  company = {},
  client = {},
  currency = 'USD',
  autoPrint = false,
  lineItemsSectionLabel = 'Services',
  documentTypeLabel,
}) {
  const printRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!isOpen || !autoPrint) return;
    const t = setTimeout(() => {
      window.print();
    }, 300);
    return () => clearTimeout(t);
  }, [isOpen, autoPrint]);

  const fitToHeight = useCallback(() => {
    if (!contentRef.current) return;
    const h = contentRef.current.clientHeight;
    const s = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (h - 48) / LETTER_HEIGHT_PX));
    setScale(Math.round(s * 100) / 100);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setScale(1);
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  const zoomIn = () => setScale((s) => Math.min(MAX_ZOOM, ZOOM_STEPS.find((z) => z > s) ?? s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(MIN_ZOOM, ZOOM_STEPS.slice().reverse().find((z) => z < s) ?? s - 0.25));
  const set100 = () => setScale(1);

  const title = type === 'proposal' ? `View ${documentTypeLabel || 'proposal'}` : `View ${documentTypeLabel || 'invoice'}`;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] data-[state=open]:animate-[fadeIn_150ms_ease-out] data-[state=closed]:animate-[fadeOut_150ms_ease-out]" />
        <Dialog.Content
          className="document-view-dialog-content fixed inset-0 z-[201] flex flex-col bg-gray-100 dark:bg-gray-900 data-[state=open]:animate-[fadeIn_150ms_ease-out] data-[state=closed]:animate-[fadeOut_150ms_ease-out] focus:outline-none print:bg-white"
          aria-describedby={undefined}
        >
          <div className="document-view-header flex items-center justify-between flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </Dialog.Title>
            <div className="flex items-center gap-2">
              <PrimaryButton type="button" onClick={handlePrint} className="gap-2">
                <HiPrinter className="w-5 h-5" />
                Print
              </PrimaryButton>
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <div
            ref={(el) => {
              contentRef.current = el;
              printRef.current = el;
            }}
            className="document-view-content flex-1 min-h-0 overflow-auto flex items-start justify-center p-6 bg-gray-200/50 dark:bg-gray-800/50 print:p-0 print:bg-white relative"
          >
            <div
              className="relative flex justify-center transition-[width,min-height] duration-150 print:!scale-100"
              style={{
                width: `${LETTER_WIDTH_PX * scale}px`,
                minHeight: `${LETTER_HEIGHT_PX * scale}px`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: LETTER_WIDTH_PX,
                  minHeight: LETTER_HEIGHT_PX,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
                className="print:!relative print:!transform-none print:!w-[8.5in] print:!min-h-[11in]"
              >
                <ProposalInvoiceDocument
                  type={type}
                  documentTypeLabel={documentTypeLabel}
                  company={company}
                  client={client}
                  document={doc}
                  currency={currency}
                  lineItemsSectionLabel={lineItemsSectionLabel}
                />
              </div>
            </div>
            <div className="document-view-zoom fixed bottom-4 right-8 flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg p-1.5 print:hidden">
              <button
                type="button"
                onClick={zoomOut}
                disabled={scale <= MIN_ZOOM}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <HiMinus className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={set100}
                className="min-w-[3.5rem] px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="100%"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={scale >= MAX_ZOOM}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <HiPlus className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" aria-hidden="true" />
              <button
                type="button"
                onClick={fitToHeight}
                className="px-2.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors whitespace-nowrap"
                title="Fit to screen height"
              >
                Fit
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .document-view-dialog-content,
          .document-view-dialog-content *,
          .document-view-content,
          .document-view-content * {
            visibility: visible;
          }
          .document-view-dialog-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            transform: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .document-view-header,
          .document-view-zoom {
            display: none !important;
          }
        }
      `}</style>
    </Dialog.Root>
  );
}
