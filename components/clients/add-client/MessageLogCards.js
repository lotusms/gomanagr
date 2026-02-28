import { HiTrash } from 'react-icons/hi';
import { IconButton } from '@/components/ui/buttons';

function clipBody(text, maxLines) {
  if (maxLines === undefined) maxLines = 3;
  if (!text || typeof text !== 'string') return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  const clipped = lines.slice(0, maxLines).join('\n');
  return lines.length > maxLines ? clipped + '\n…' : clipped;
}

function formatMessageDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
}

const CHANNEL_LABELS = { sms: 'SMS', chat: 'Chat', other: 'Other' };
function channelLabel(channel) {
  return CHANNEL_LABELS[channel] || 'Other';
}

export default function MessageLogCards({ messages, onSelect, onDelete, borderClass }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {messages.map((message) => (
        <div
          key={message.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(message.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(message.id);
            }
          }}
          className={'relative w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer pl-4 pr-11 py-3 min-h-[56px] ' + (borderClass || '')}
        >
          <div className="absolute top-1 right-1 flex items-center">
            <IconButton
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(message.id);
              }}
              className="!p-1.5 !bg-transparent !border-transparent hover:!bg-red-50 dark:hover:!bg-red-900/20 opacity-60 group-hover:opacity-100 transition-opacity rounded-lg"
              title="Delete message"
              aria-label="Delete message"
            >
              <HiTrash className="w-4 h-4" />
            </IconButton>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="font-medium">{channelLabel(message.channel)}</span>
            <span>·</span>
            <span className="font-medium capitalize">{message.direction}</span>
            <span>·</span>
            <time dateTime={message.sent_at}>{formatMessageDate(message.sent_at)}</time>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate pr-8">{message.author || '—'}</p>
          <p className="text-sm text-gray-900 dark:text-white mt-1 line-clamp-3 whitespace-pre-wrap">{clipBody(message.body, 3)}</p>
        </div>
      ))}
    </div>
  );
}
