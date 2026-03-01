import CardDeleteButton from './CardDeleteButton';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { formatCurrency } from '@/utils/formatCurrency';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';

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

export default function ProposalLogCards({ proposals, onSelect, onDelete, borderClass, defaultCurrency = 'USD' }) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';

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
          <div className="absolute top-1 right-1 flex items-center">
            <CardDeleteButton
              onDelete={() => onDelete(p.id)}
              title="Delete proposal"
              className="opacity-60 group-hover:opacity-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            {p.proposal_number && <span>{p.proposal_number}</span>}
            {p.status && (
              <span className="font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                {STATUS_LABELS[p.status] || p.status}
              </span>
            )}
            {p.date_created && <time dateTime={p.date_created}>{formatDateFromISO(p.date_created, dateFormat, timezone)}</time>}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-8">{p.proposal_title || 'Untitled proposal'}</p>
          {p.estimated_value != null && p.estimated_value !== '' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Est. value: {formatCurrency(p.estimated_value, defaultCurrency)}</p>
          )}
          {p.scope_summary && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-3 whitespace-pre-wrap pr-8">{clipText(p.scope_summary, 3)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
