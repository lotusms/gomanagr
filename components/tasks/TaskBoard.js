import { useCallback } from 'react';
import { TASK_STATUSES } from '@/config/taskConstants';
import TaskCard from './TaskCard';
import { HiPlus } from 'react-icons/hi';

function Column({ status, tasks, assigneeNameById, onStatusChange, onDelete, onAddTask }) {
  const label = TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

  return (
    <div className="flex-shrink-0 w-72 bg-gray-100 dark:bg-gray-700/50 rounded-lg flex flex-col max-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-600">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">{label}</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">{tasks.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            assigneeName={task.assignee_id ? assigneeNameById[task.assignee_id] : null}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
          />
        ))}
        <button
          type="button"
          onClick={() => onAddTask(status)}
          className="flex items-center gap-2 w-full py-2 px-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-500 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-400 transition-colors text-sm"
        >
          <HiPlus className="w-4 h-4" />
          Add a card
        </button>
      </div>
    </div>
  );
}

export default function TaskBoard({ tasks, assigneeNameById, onStatusChange, onDelete, onAddTask }) {
  const tasksByStatus = useCallback(() => {
    const map = {};
    TASK_STATUSES.forEach((s) => {
      map[s.value] = [];
    });
    (tasks || []).forEach((t) => {
      if (!map[t.status]) map[t.status] = [];
      map[t.status].push(t);
    });
    TASK_STATUSES.forEach((s) => {
      map[s.value].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    });
    return map;
  }, [tasks]);

  const byStatus = tasksByStatus();

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {TASK_STATUSES.map((s) => (
        <Column
          key={s.value}
          status={s.value}
          tasks={byStatus[s.value] || []}
          assigneeNameById={assigneeNameById || {}}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onAddTask={onAddTask}
        />
      ))}
    </div>
  );
}
