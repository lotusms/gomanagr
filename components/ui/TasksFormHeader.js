/**
 * Header for task edit forms. Shows: title, document ID, status; then due date, priority, assignee; then client, project.
 */
import InputField from '@/components/ui/InputField';
import Dropdown from '@/components/ui/Dropdown';
import DateField from '@/components/ui/DateField';

export default function TasksFormHeader({
  idPrefix = 'task',
  titleLabel,
  titleValue,
  titlePlaceholder,
  titleRequired = false,
  onTitleChange,
  documentIdLabel,
  documentIdValue,
  documentIdPlaceholder,
  onDocumentIdChange,
  statusLabel,
  statusValue,
  statusOptions = [],
  onStatusChange,
  startDateValue,
  onStartDateChange,
  startDateLabel = 'Start date',
  durationDaysValue,
  onDurationDaysChange,
  durationDaysLabel = 'Time to complete (days)',
  priorityValue,
  onPriorityChange,
  priorityOptions = [],
  priorityLabel = 'Priority',
  assigneeValue = '',
  onAssigneeChange,
  assigneeOptions = [],
  assigneeLabel = 'Assignee',
  assigneePlaceholder = 'Assign to...',
  clientValue = '',
  onClientChange,
  clientOptions = [],
  clientLabel = 'Client',
  clientPlaceholder = 'Select a client',
  projectValue = '',
  onProjectChange,
  projectOptions = [],
  projectLabel = 'Project',
  projectPlaceholder = 'Select a project',
}) {
  const gridColsThree = 'grid-cols-1 xl:grid-cols-3';
  const hasSecondRow = onStartDateChange != null || onDurationDaysChange != null || onPriorityChange != null || onAssigneeChange != null;
  const hasThirdRow = onClientChange != null || onProjectChange != null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4 space-y-4">
      <div className={`grid ${gridColsThree} gap-4`}>
        <InputField
          id={`${idPrefix}-title`}
          label={titleLabel}
          value={titleValue}
          onChange={onTitleChange}
          variant="light"
          placeholder={titlePlaceholder}
          required={titleRequired}
        />
        <InputField
          id={`${idPrefix}-number`}
          label={documentIdLabel}
          value={documentIdValue}
          onChange={onDocumentIdChange}
          variant="light"
          placeholder={documentIdPlaceholder}
        />
        <Dropdown
          id={`${idPrefix}-status`}
          name={`${idPrefix}-status`}
          label={statusLabel}
          value={statusValue}
          onChange={(e) => onStatusChange(e)}
          options={statusOptions}
          searchable={false}
        />
      </div>
      {hasSecondRow && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {onStartDateChange != null && (
            <DateField
              id={`${idPrefix}-start`}
              label={startDateLabel}
              value={startDateValue ?? ''}
              onChange={(e) => onStartDateChange(e.target.value)}
              variant="light"
              min="2000-01-01"
            />
          )}
          {onDurationDaysChange != null && (
            <InputField
              id={`${idPrefix}-duration-days`}
              type="number"
              min={1}
              label={durationDaysLabel}
              value={durationDaysValue ?? ''}
              onChange={(e) => onDurationDaysChange(e.target.value)}
              placeholder="e.g. 2"
              variant="light"
              title="For Gantt: bar spans this many days ending on due date"
            />
          )}
          {onPriorityChange != null && (
            <Dropdown
              id={`${idPrefix}-priority`}
              name={`${idPrefix}-priority`}
              label={priorityLabel}
              value={priorityValue ?? ''}
              onChange={(e) => onPriorityChange(e)}
              options={priorityOptions}
              placeholder={`Select ${priorityLabel.toLowerCase()}`}
              searchable={false}
            />
          )}
        </div>
      )}
      {hasThirdRow && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {onAssigneeChange != null && (
            <Dropdown
              id={`${idPrefix}-assignee`}
              name={`${idPrefix}-assignee`}
              label={assigneeLabel}
              value={assigneeValue}
              onChange={(e) => onAssigneeChange(e)}
              options={assigneeOptions}
              placeholder={assigneePlaceholder}
              searchable={assigneeOptions.length > 8}
            />
          )}
          {onClientChange != null && (
            <Dropdown
              id={`${idPrefix}-client`}
              name={`${idPrefix}-client`}
              label={clientLabel}
              value={clientValue}
              onChange={(e) => onClientChange(e)}
              options={clientOptions}
              placeholder={clientPlaceholder}
              searchable={clientOptions.length > 5}
              searchThreshold={5}
            />
          )}
          {onProjectChange != null && (
            <Dropdown
              id={`${idPrefix}-project`}
              name={`${idPrefix}-project`}
              label={projectLabel}
              value={projectValue}
              onChange={(e) => onProjectChange(e)}
              options={projectOptions}
              placeholder={projectPlaceholder}
              searchable={projectOptions.length > 5}
              searchThreshold={5}
            />
          )}
        </div>
      )}
    </div>
  );
}
