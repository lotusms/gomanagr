import { HiPaperClip } from 'react-icons/hi';
import CardDeleteButton from './CardDeleteButton';

function clipBody(text, maxLines = 3) {
  if (!text || typeof text !== 'string') return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  const clipped = lines.slice(0, maxLines).join('\n');
  return lines.length > maxLines ? `${clipped}\n…` : clipped;
}

function formatEmailDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
}

function hasAttachments(email) {
  return Array.isArray(email?.attachments) && email.attachments.length > 0;
}

/**
 * Grid of email log cards. Each card shows direction, date, subject, body preview;
 * optional attachment icon; delete button. Clicking the card triggers onSelect.
 *
 * @param {Array<{id: string, direction: string, sent_at: string, subject?: string, body?: string, attachments?: array}>} emails
 * @param {(id: string) => void} onSelect - Called when user clicks a card (e.g. navigate to edit)
 * @param {(id: string) => void} onDelete - Called when user clicks delete (e.g. open confirm dialog)
 * @param {string} borderClass - Tailwind border class for the left accent (e.g. border-l-primary-500)
 */
export default function EmailLogCards({ emails, onSelect, onDelete, borderClass }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {emails.map((email) => (
        <div
          key={email.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(email.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(email.id);
            }
          }}
          className={`relative w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer pl-4 pr-11 py-3 min-h-[56px] ${borderClass}`}
        >
          <div className="absolute top-1 right-1 flex items-center">
            {hasAttachments(email) && (
              <span
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400"
                title="Has attachments"
                aria-hidden
              >
                <HiPaperClip className="w-4 h-4" />
              </span>
            )}
            <CardDeleteButton
              onDelete={() => onDelete(email.id)}
              title="Delete email"
              className="group-hover:opacity-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="font-medium capitalize">{email.direction}</span>
            <span>·</span>
            <time dateTime={email.sent_at}>{formatEmailDate(email.sent_at)}</time>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-8">{email.subject || 'No subject'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-3 whitespace-pre-wrap">{clipBody(email.body, 3)}</p>
        </div>
      ))}
    </div>
  );
}
