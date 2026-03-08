import Link from 'next/link';
import CardDeleteButton from './CardDeleteButton';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';

function clipText(text, maxLines) {
  if (maxLines === undefined) maxLines = 3;
  if (!text || typeof text !== 'string') return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  const clipped = lines.slice(0, maxLines).join('\n');
  return lines.length > maxLines ? clipped + '\n…' : clipped;
}

const STATUS_LABELS = { draft: 'Draft', active: 'Active', inactive: 'Inactive', completed: 'Completed', abandoned: 'Abandoned' };
const TYPE_LABELS = {
  service_agreement: 'Service agreement',
  retainer_agreement: 'Retainer agreement',
  maintenance_agreement: 'Maintenance agreement',
  nda: 'NDA',
  vendor_agreement: 'Vendor agreement',
};

export default function ContractLogCards({ contracts, onSelect, onDelete, borderClass, defaultCurrency = 'USD', attachments = [], clientId, proposalTermSingular = 'Proposal' }) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';

  const baseClass = 'relative w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer pl-4 pr-11 py-3 min-h-[56px]';
  const cardClass = borderClass ? baseClass + ' ' + borderClass : baseClass;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {contracts.map((c) => (
        <div
          key={c.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(c.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(c.id);
            }
          }}
          className={cardClass}
        >
          <div className="absolute top-1 right-1 flex items-center">
            <CardDeleteButton
              onDelete={() => onDelete(c.id)}
              title="Delete contract"
              className="group-hover:opacity-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            {c.contract_number && <span>{c.contract_number}</span>}
            {c.status && (
              <span className="font-medium px-2 py-0.5 rounded bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                {STATUS_LABELS[c.status] || c.status}
              </span>
            )}
            {c.start_date && <time dateTime={c.start_date}>{formatDateFromISO(c.start_date, dateFormat, timezone)}</time>}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-8">{c.contract_title || 'Untitled contract'}</p>
            {c.related_proposal && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              From {proposalTermSingular.toLowerCase()}: {[c.related_proposal.proposal_number, c.related_proposal.proposal_title].filter(Boolean).join(' – ') || proposalTermSingular}
            </p>
          )}
          {c.contract_value != null && c.contract_value !== '' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Value: {formatCurrency(c.contract_value, defaultCurrency)}
            </p>
          )}
          {clientId && attachments.filter((a) => a.linked_contract_id === c.id).length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" onClick={(e) => e.stopPropagation()}>
              Linked attachments:{' '}
              {attachments
                .filter((a) => a.linked_contract_id === c.id)
                .map((att, i) => (
                  <span key={att.id}>
                    {i > 0 && ', '}
                    <Link
                      href={`/dashboard/clients/${clientId}/attachments/${att.id}/edit`}
                      className="text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {att.file_name || 'Unnamed file'}
                    </Link>
                  </span>
                ))}
            </p>
          )}
          {c.scope_summary && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-3 whitespace-pre-wrap pr-8">{clipText(c.scope_summary, 3)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
