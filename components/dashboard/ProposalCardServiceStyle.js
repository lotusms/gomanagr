import { HiDocumentText, HiTrash } from 'react-icons/hi';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { formatCurrency } from '@/utils/formatCurrency';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';

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
}) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';

  const clientName = proposal.client_id && clientNameByClientId[proposal.client_id];
  const statusLabel = proposal.status ? (STATUS_LABELS[proposal.status] || proposal.status) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(proposal.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(proposal.id);
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
                {proposal.proposal_title || 'Untitled proposal'}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(proposal.id);
              }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              title="Delete proposal"
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
          {proposal.proposal_number && <span>{proposal.proposal_number}</span>}
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

        {proposal.estimated_value != null && proposal.estimated_value !== '' && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Est. value: {formatCurrency(proposal.estimated_value, defaultCurrency)}
          </p>
        )}

        {proposal.scope_summary && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
            {proposal.scope_summary}
          </p>
        )}

        {!proposal.scope_summary && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No scope summary</p>
        )}
      </div>
    </div>
  );
}
