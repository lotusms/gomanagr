import { HiBookmark } from 'react-icons/hi';
import CardDeleteButton from './CardDeleteButton';

function clipText(text, maxLines) {
  if (maxLines === undefined) maxLines = 3;
  if (!text || typeof text !== 'string') return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  const clipped = lines.slice(0, maxLines).join('\n');
  return lines.length > maxLines ? clipped + '\n…' : clipped;
}

const TAG_LABELS = { reminder: 'Reminder', warning: 'Warning', preference: 'Preference', billing: 'Billing', issue: 'Issue' };

export default function InternalNoteLogCards({ notes, onSelect, onDelete, borderClass, currentUserId }) {
  const baseClass = 'relative w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer pl-4 pr-11 py-3 min-h-[56px]';
  const cardClass = borderClass ? baseClass + ' ' + borderClass : baseClass;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {notes.map((note) => (
        <div
          key={note.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(note.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(note.id);
            }
          }}
          className={cardClass}
        >
          <div className="absolute top-1 right-1 flex items-center gap-1">
            {note.is_pinned && <HiBookmark className="w-4 h-4 text-amber-500 flex-shrink-0" title="Pinned" />}
            <CardDeleteButton
              onDelete={() => onDelete(note.id)}
              title="Delete internal note"
              className="group-hover:opacity-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {note.tag && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                {TAG_LABELS[note.tag] || note.tag}
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Created by {currentUserId && note.user_id === currentUserId ? 'you' : 'team'}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 whitespace-pre-wrap pr-8">{clipText(note.content, 3)}</p>
        </div>
      ))}
    </div>
  );
}
