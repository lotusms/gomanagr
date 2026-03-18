import { HiFolder } from 'react-icons/hi';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import EntityCard from '@/components/ui/EntityCard';

const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  inactive: 'Inactive',
  on_hold: 'On hold',
  completed: 'Completed',
  abandoned: 'Abandoned',
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
  industry: industryProp = null,
}) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';
  const effectiveIndustry = industryProp ?? account?.industry ?? null;
  const projectTermPlural = getTermForIndustry(effectiveIndustry, 'project');
  const projectTermSingular = getTermSingular(projectTermPlural) || 'Project';
  const untitledLabel = (projectTermSingular || 'project').toLowerCase();

  const clientName = project.client_id && clientNameByClientId[project.client_id];
  const statusLabel = project.status ? (STATUS_LABELS[project.status] || project.status) : null;

  return (
    <EntityCard
      icon={HiFolder}
      title={project.project_name || `Untitled ${untitledLabel}`}
      onSelect={() => onSelect(project.id)}
      onDelete={() => onDelete(project.id)}
      deleteTitle={`Delete ${untitledLabel}`}
    >
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

      {(project.scope_summary ?? project.description) ? (
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
          {project.scope_summary ?? project.description}
        </p>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No scope summary</p>
      )}
    </EntityCard>
  );
}
