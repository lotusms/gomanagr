import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiDocumentText, HiEye, HiPrinter, HiDotsVertical } from 'react-icons/hi';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';
import { DocumentViewDialog } from '@/components/documents';
import { buildProposalDocumentPayload, buildCompanyForDocument } from '@/lib/buildDocumentPayload';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import EntityCard from '@/components/ui/EntityCard';

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
};

/**
 * Single proposal card in the same visual style as the services page:
 * gradient header with icon + title + actions, content area with details.
 * Used only on the dashboard Proposals page (not in client Documents & Files).
 */
export default function ProposalCardServiceStyle({
  proposal,
  onSelect,
  onDelete,
  clientNameByClientId = {},
  defaultCurrency = 'USD',
  organization = null,
}) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';
  const industry = organization?.industry ?? account?.industry;
  const lineItemsSectionLabel = getTermForIndustry(industry, 'services');
  const proposalTermPlural = getTermForIndustry(industry, 'proposal');
  const proposalTermSingular = getTermSingular(proposalTermPlural) || 'Proposal';
  const proposalTermSingularLower = proposalTermSingular.toLowerCase();
  const untitledProposalLabel = `Untitled ${proposalTermSingularLower}`;
  const [viewState, setViewState] = useState({ open: false, autoPrint: false });
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

  const clientName = proposal.client_id && clientNameByClientId[proposal.client_id];
  const statusLabel = proposal.status ? (STATUS_LABELS[proposal.status] || proposal.status) : null;
  const company = buildCompanyForDocument(account, organization);

  const menuButton = (
    <div className="relative">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
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
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              setViewState({ open: true, autoPrint: false });
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <HiEye className="w-4 h-4 flex-shrink-0" />
            View {proposalTermSingularLower}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              setViewState({ open: true, autoPrint: true });
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <HiPrinter className="w-4 h-4 flex-shrink-0" />
            Print {proposalTermSingularLower}
          </button>
        </div>,
        document.body
      )}
    </div>
  );

  return (
    <>
      <EntityCard
        icon={HiDocumentText}
        title={proposal.proposal_title || untitledProposalLabel}
        onSelect={() => onSelect(proposal.id)}
        onDelete={() => onDelete(proposal.id)}
        deleteTitle={`Delete ${proposalTermSingularLower}`}
        headerActions={menuButton}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
          {clientName && (
            <span className="font-medium text-gray-700 dark:text-gray-300">{clientName}</span>
          )}
          {proposal.proposal_number && <span title={`${proposalTermSingular} ID`}>{proposal.proposal_number}</span>}
          {statusLabel && (
            <span className="font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
              {statusLabel}
            </span>
          )}
          {proposal.date_created && (
            <time dateTime={proposal.date_created}>
              {formatDateFromISO(proposal.date_created, dateFormat, timezone)}
            </time>
          )}
        </div>

        {proposal.scope_summary && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
            {proposal.scope_summary}
          </p>
        )}

        {!proposal.scope_summary && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No scope summary</p>
        )}
      </EntityCard>
      {viewState.open && (
        <DocumentViewDialog
          isOpen={viewState.open}
          onClose={() => setViewState({ open: false, autoPrint: false })}
          type="proposal"
          documentTypeLabel={proposalTermSingular}
          document={buildProposalDocumentPayload(proposal)}
          company={company}
          client={{ name: clientName || 'Client', email: '' }}
          currency={defaultCurrency}
          autoPrint={viewState.autoPrint}
          lineItemsSectionLabel={lineItemsSectionLabel}
        />
      )}
    </>
  );
}
