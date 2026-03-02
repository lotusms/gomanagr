import { HiFolder, HiTrash } from 'react-icons/hi';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/**
 * Single project card in the same visual style as the services page.
 * Used only on the dashboard Projects page.
 */
export default function ProjectCardServiceStyle({
  project,
  onSelect,
  onDelete,
  clientNameByClientId = {},
}) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';

  const clientName = project.client_id && clientNameByClientId[project.client_id];
  const statusLabel = project.status ? (STATUS_LABELS[project.status] || project.status) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(project.id);
        }
      }}
      className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-600 transition-all duration-300 flex flex-col cursor-pointer"
    >
      <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <HiFolder className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">
                {project.project_name || 'Untitled project'}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(project.id);
              }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              title="Delete project"
            >
              <HiTrash className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
          {clientName && (
            <span className="font-medium text-gray-700 dark:text-gray-300">{clientName}</span>
          )}
          {statusLabel && (
            <span className="font-medium px-2 py-0.5 rounded bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
              {statusLabel}
            </span>
          )}
          {project.start_date && (
            <time dateTime={project.start_date}>
              {formatDateFromISO(project.start_date, dateFormat, timezone)}
            </time>
          )}
          {project.end_date && (
            <>
              <span>–</span>
              <time dateTime={project.end_date}>
                {formatDateFromISO(project.end_date, dateFormat, timezone)}
              </time>
            </>
          )}
        </div>

        {project.description ? (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
            {project.description}
          </p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No description</p>
        )}
      </div>
    </div>
  );
}
