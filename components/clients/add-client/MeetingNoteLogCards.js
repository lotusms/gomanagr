import CardDeleteButton from './CardDeleteButton';
import { formatDateTimeFromISO } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';

function clipText(text, maxLines) {
  if (maxLines === undefined) maxLines = 3;
  if (!text || typeof text !== 'string') return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  const clipped = lines.slice(0, maxLines).join('\n');
  return lines.length > maxLines ? clipped + '\n…' : clipped;
}

export default function MeetingNoteLogCards({ notes, onSelect, onDelete, borderClass }) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timeFormat = account?.timeFormat ?? '24h';
  const timezone = account?.timezone ?? 'UTC';

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
          <div className="absolute top-1 right-1 flex items-center">
            <CardDeleteButton
              onDelete={() => onDelete(note.id)}
              title="Delete meeting note"
              className="group-hover:opacity-100"
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            <time dateTime={note.meeting_at}>{formatDateTimeFromISO(note.meeting_at, dateFormat, timeFormat, timezone)}</time>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-8">{note.title || 'Untitled meeting'}</p>
          {note.location_zoom_link ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate pr-8 mt-0.5">{note.location_zoom_link}</p>
          ) : null}
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-3 whitespace-pre-wrap">{clipText(note.notes, 3)}</p>
        </div>
      ))}
    </div>
  );
}
