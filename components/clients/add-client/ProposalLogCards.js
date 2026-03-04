import { useState } from 'react';
import CardDeleteButton from './CardDeleteButton';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';
import { DocumentViewDialog } from '@/components/documents';
import { buildProposalDocumentPayload, buildCompanyForDocument } from '@/lib/buildDocumentPayload';
import { HiEye, HiPrinter } from 'react-icons/hi';

function clipText(text, maxLines) {
  if (maxLines === undefined) maxLines = 3;
  if (!text || typeof text !== 'string') return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  const clipped = lines.slice(0, maxLines).join('\n');
  return lines.length > maxLines ? clipped + '\n…' : clipped;
}

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
};

/**
 * @param {Object} [clientNameByClientId] - Optional map of client_id -> display name (e.g. when listing all proposals)
 * @param {string} [clientName] - Client display name (for document view when in single-client context)
 * @param {string} [clientEmail] - Client email (for document view)
 * @param {string[]} [clientAddressLines] - Client address lines for Bill to (e.g. from billing or company address)
 * @param {Object|null} [organization] - User's organization (for company name, logo, address, phone on document)
 */
export default function ProposalLogCards({ proposals, onSelect, onDelete, borderClass, clientNameByClientId, clientName = '', clientEmail = '', clientAddressLines = [], defaultCurrency = 'USD', organization = null }) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';
  const [viewState, setViewState] = useState({ proposal: null, autoPrint: false });

  const company = buildCompanyForDocument(account, organization);
  const closeView = () => setViewState({ proposal: null, autoPrint: false });

  const baseClass = 'relative w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer pl-4 pr-11 py-3 min-h-[56px]';
  const cardClass = borderClass ? baseClass + ' ' + borderClass : baseClass;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {proposals.map((p) => (
        <div
          key={p.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(p.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(p.id);
            }
          }}
          className={cardClass}
        >
          <div className="absolute top-1 right-1 flex items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setViewState({ proposal: p, autoPrint: false });
              }}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/80 dark:hover:bg-gray-600/80 transition-colors"
              title="View proposal"
            >
              <HiEye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setViewState({ proposal: p, autoPrint: true });
              }}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/80 dark:hover:bg-gray-600/80 transition-colors"
              title="Print proposal"
            >
              <HiPrinter className="w-4 h-4" />
            </button>
            <CardDeleteButton
              onDelete={() => onDelete(p.id)}
              title="Delete proposal"
              className="opacity-60 group-hover:opacity-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            {clientNameByClientId && p.client_id && clientNameByClientId[p.client_id] && (
              <span className="font-medium">{clientNameByClientId[p.client_id]}</span>
            )}
            {p.proposal_number && (
              <span title="Proposal ID">{p.proposal_number}</span>
            )}
            {p.status && (
              <span className="font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                {STATUS_LABELS[p.status] || p.status}
              </span>
            )}
            {p.date_created && <time dateTime={p.date_created}>{formatDateFromISO(p.date_created, dateFormat, timezone)}</time>}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-8">{p.proposal_title || 'Untitled proposal'}</p>
          {p.scope_summary && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-3 whitespace-pre-wrap pr-8">{clipText(p.scope_summary, 3)}</p>
          )}
        </div>
      ))}
      {viewState.proposal && (
        <DocumentViewDialog
          isOpen={!!viewState.proposal}
          onClose={closeView}
          type="proposal"
          document={buildProposalDocumentPayload(viewState.proposal)}
          company={company}
          client={{
            name: (viewState.proposal.client_id && clientNameByClientId?.[viewState.proposal.client_id]) || clientName || 'Client',
            email: clientEmail || '',
            ...(clientAddressLines.length > 0 ? { addressLines: clientAddressLines } : {}),
          }}
          currency={defaultCurrency}
          autoPrint={viewState.autoPrint}
        />
      )}
    </div>
  );
}
