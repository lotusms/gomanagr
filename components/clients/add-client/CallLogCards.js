import { HiTrash } from 'react-icons/hi';
import { IconButton } from '@/components/ui/buttons';

function clipText(text, maxLines) {
  if (maxLines === undefined) maxLines = 3;
  if (!text || typeof text !== 'string') return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  const clipped = lines.slice(0, maxLines).join('\n');
  return lines.length > maxLines ? clipped + '\n…' : clipped;
}

function formatCallDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
}

export default function CallLogCards({ calls, onSelect, onDelete, borderClass }) {
  const baseClass = 'relative w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer pl-4 pr-11 py-3 min-h-[56px]';
  const cardClass = borderClass ? baseClass + ' ' + borderClass : baseClass;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {calls.map((call) => (
        <div
          key={call.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(call.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(call.id);
            }
          }}
          className={cardClass}
        >
          <div className="absolute top-1 right-1 flex items-center">
            <IconButton
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(call.id);
              }}
              className="!p-1.5 !bg-transparent !border-transparent hover:!bg-red-50 dark:hover:!bg-red-900/20 opacity-60 group-hover:opacity-100 transition-opacity rounded-lg"
              title="Delete call"
              aria-label="Delete call"
            >
              <HiTrash className="w-4 h-4" />
            </IconButton>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="font-medium capitalize">{call.direction}</span>
            <span>·</span>
            <time dateTime={call.called_at}>{formatCallDate(call.called_at)}</time>
            {call.duration ? (
              <>
                <span>·</span>
                <span>{call.duration}</span>
              </>
            ) : null}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate pr-8">{call.phone_number || '—'}</p>
          <p className="text-sm text-gray-900 dark:text-white mt-1 line-clamp-3 whitespace-pre-wrap">{clipText(call.summary, 3)}</p>
        </div>
      ))}
    </div>
  );
}
