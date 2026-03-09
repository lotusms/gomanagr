import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/config/taskConstants';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import Avatar from '@/components/ui/Avatar';
import { Table } from '@/components/ui';
import { COLUMN_LABELS } from '@/lib/taskSettings';

const priorityLabel = (v) => TASK_PRIORITIES.find((p) => p.value === v)?.label ?? v;

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  medium: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  high: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

const ALL_COLUMN_KEYS = ['assignee', 'title', 'client', 'status', 'priority', 'due_at'];

export default function TaskList({
  tasks,
  assigneeNameById,
  assigneePhotoById = {},
  clientNameById,
  onDelete,
  columnsConfig,
  statusLabels: statusLabelsMap,
}) {
  const router = useRouter();
  const statusLabel = (v) =>
    statusLabelsMap?.[v] ?? TASK_STATUSES.find((s) => s.value === v)?.label ?? v;

  const columns = useMemo(() => {
    const visibleKeys = columnsConfig
      ? ALL_COLUMN_KEYS.filter((k) => columnsConfig[k] !== false)
      : ALL_COLUMN_KEYS;
    const defs = [
      {
        key: 'assignee',
        label: COLUMN_LABELS.assignee,
        widthClass: 'w-[13rem]',
        render: (task) => {
          if (!task.assignee_id) return '—';
          const name = assigneeNameById?.[task.assignee_id] || 'Unknown';
          const photo = assigneePhotoById[task.assignee_id];
          return (
            <span className="inline-flex items-center gap-2">
              <Avatar
                src={photo || undefined}
                name={name}
                className="!size-6 flex-shrink-0 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
              />
              <span>{name}</span>
            </span>
          );
        },
      },
      {
        key: 'title',
        label: COLUMN_LABELS.title,
        widthClass: undefined,
        render: (task) =>
          task.title ? (
            <span className="font-medium text-gray-900 dark:text-white">{task.title}</span>
          ) : (
            '—'
          ),
      },
      {
        key: 'client',
        label: COLUMN_LABELS.client,
        widthClass: 'w-[13rem]',
        render: (task) =>
          (task.client_id && clientNameById?.[task.client_id]) ||
          (task.linked_client_id && clientNameById?.[task.linked_client_id]) ||
          '—',
      },
      {
        key: 'status',
        label: COLUMN_LABELS.status,
        widthClass: 'w-[10rem]',
        render: (task) => statusLabel(task.status),
      },
      {
        key: 'priority',
        label: COLUMN_LABELS.priority,
        widthClass: 'w-[8rem]',
        render: (task) => {
          const label = priorityLabel(task.priority);
          const chipClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${chipClass}`}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'due_at',
        label: COLUMN_LABELS.due_at,
        widthClass: 'w-[8rem]',
        render: (task) => (task.due_at ? formatDateFromISO(task.due_at) : '—'),
      },
    ];
    return defs.filter((col) => visibleKeys.includes(col.key));
  }, [assigneeNameById, assigneePhotoById, clientNameById, columnsConfig, statusLabelsMap]);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm">
      <Table
        ariaLabel="Tasks"
        columns={columns}
        data={tasks || []}
        getRowKey={(task) => task.id}
        onRowClick={(task) => router.push(`/dashboard/tasks/${task.id}/edit`)}
      />
    </div>
  );
}
