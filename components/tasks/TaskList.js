import { useRouter } from 'next/router';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/config/taskConstants';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';

const statusLabel = (v) => TASK_STATUSES.find((s) => s.value === v)?.label ?? v;
const priorityLabel = (v) => TASK_PRIORITIES.find((p) => p.value === v)?.label ?? v;

export default function TaskList({ tasks, assigneeNameById, clientNameById, onDelete }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Title
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Priority
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Assignee
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Due date
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Client
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
          {(tasks || []).map((task) => (
            <tr
              key={task.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/dashboard/tasks/${task.id}/edit`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/dashboard/tasks/${task.id}/edit`);
                }
              }}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
            >
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                {task.title || 'Untitled'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {statusLabel(task.status)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {priorityLabel(task.priority)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {task.assignee_id && assigneeNameById ? assigneeNameById[task.assignee_id] : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {task.due_at ? formatDateFromISO(task.due_at) : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {(task.client_id && clientNameById?.[task.client_id]) || (task.linked_client_id && clientNameById?.[task.linked_client_id]) || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
