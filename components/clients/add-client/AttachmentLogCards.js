import Link from 'next/link';
import CardDeleteButton from './CardDeleteButton';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';

function clipText(text, maxLen) {
  if (!text || typeof text !== 'string') return '';
  return text.length <= (maxLen || 80) ? text : text.slice(0, maxLen || 80) + '…';
}

function displayFileName(attachment) {
  let segment = attachment.file_name || '';
  if (!segment && attachment.file_url) {
    try {
      if (attachment.file_url.startsWith('http')) {
        segment = new URL(attachment.file_url).pathname.split('/').filter(Boolean).pop() || '';
      } else segment = String(attachment.file_url);
    } catch {
      segment = '';
    }
  }
  segment = String(segment).trim();
  const match = segment.match(/^\d+-[a-z0-9]+-(.+)$/);
  return match ? match[1] : segment || 'Unnamed file';
}

export default function AttachmentLogCards({ attachments, onSelect, onDelete, borderClass, clientId, contractTermSingularLower = 'contract' }) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';

  const baseClass = 'relative w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer pl-4 pr-11 py-3 min-h-[56px]';
  const cardClass = borderClass ? baseClass + ' ' + borderClass : baseClass;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {attachments.map((a) => (
        <div
          key={a.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(a.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(a.id);
            }
          }}
          className={cardClass}
        >
          <div className="absolute top-1 right-1 flex items-center">
            <CardDeleteButton
              onDelete={() => onDelete(a.id)}
              title="Delete attachment"
              className="opacity-60 group-hover:opacity-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            {a.file_type && <span>{a.file_type}</span>}
            {(a.upload_date || a.created_at) && (
              <time dateTime={a.upload_date || a.created_at}>{formatDateFromISO(a.upload_date || a.created_at, dateFormat, timezone)}</time>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-8">{displayFileName(a)}</p>
          {a.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{clipText(a.description, 100)}</p>
          )}
          {a.related_item && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Related: {clipText(a.related_item, 40)}</p>
          )}
          {clientId && a.linked_contract_id && (
            <p className="text-xs mt-0.5" onClick={(e) => e.stopPropagation()}>
              <Link
                href={`/dashboard/clients/${clientId}/contracts/${a.linked_contract_id}/edit`}
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                Linked {contractTermSingularLower}: {a.linked_contract
                  ? [a.linked_contract.contract_number, a.linked_contract.contract_title].filter(Boolean).join(' – ') || `View ${contractTermSingularLower}`
                  : `View ${contractTermSingularLower}`}
              </Link>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
