import CardDeleteButton from './CardDeleteButton';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function clipText(text, maxLines) {
  if (maxLines === undefined) maxLines = 3;
  if (!text || typeof text !== 'string') return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  const clipped = lines.slice(0, maxLines).join('\n');
  return lines.length > maxLines ? clipped + '\n…' : clipped;
}

export default function ProjectLogCards({ projects, onSelect, onDelete, borderClass }) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';

  const baseClass = 'relative w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer pl-4 pr-11 py-3 min-h-[56px]';
  const cardClass = borderClass ? baseClass + ' ' + borderClass : baseClass;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {projects.map((p) => (
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
              title="Delete project"
              className="opacity-60 group-hover:opacity-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            {p.status && (
              <span className="font-medium px-2 py-0.5 rounded bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                {STATUS_LABELS[p.status] || p.status}
              </span>
            )}
            {p.start_date && (
              <time dateTime={p.start_date}>{formatDateFromISO(p.start_date, dateFormat, timezone)}</time>
            )}
            {p.end_date && (
              <>
                <span>–</span>
                <time dateTime={p.end_date}>{formatDateFromISO(p.end_date, dateFormat, timezone)}</time>
              </>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-8">{p.project_name || 'Untitled project'}</p>
          {p.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-3 whitespace-pre-wrap pr-8">{clipText(p.description, 3)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
