import { useCallback, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
} from '@dnd-kit/core';
import { TASK_STATUSES } from '@/config/taskConstants';
import TaskCard from './TaskCard';
import { HiPlus } from 'react-icons/hi';

function DroppableColumn({
  status,
  tasks,
  assigneeNameById,
  assigneePhotoById,
  onStatusChange,
  onDelete,
  onAddTask,
  recentlyDroppedId,
  statusLabel: statusLabelOverride,
}) {
  const label = statusLabelOverride ?? (TASK_STATUSES.find((s) => s.value === status)?.label ?? status);
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 flex flex-col max-h-[calc(100vh-12rem)] rounded-xl overflow-hidden border bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-600 ${isOver ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900 bg-primary-50 dark:bg-primary-900/30' : ''}`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate uppercase tracking-wide">
          {label}
        </h3>
        <span className="flex-shrink-0 min-w-[1.75rem] h-7 px-2 inline-flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600 text-xs font-bold text-gray-700 dark:text-gray-200 tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-h-[100px]">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            assigneeName={task.assignee_id ? assigneeNameById[task.assignee_id] : null}
            assigneePhoto={task.assignee_id && assigneePhotoById ? assigneePhotoById[task.assignee_id] : null}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            recentlyDroppedId={recentlyDroppedId}
          />
        ))}
        <button
          type="button"
          onClick={() => onAddTask(status)}
          className="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-sm font-semibold"
        >
          <HiPlus className="w-4 h-4" />
          Add a card
        </button>
      </div>
    </div>
  );
}

export default function TaskBoard({ tasks, assigneeNameById, assigneePhotoById = {}, onStatusChange, onDelete, onAddTask, statusLabels }) {
  const [activeId, setActiveId] = useState(null);
  const [recentlyDroppedId, setRecentlyDroppedId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

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

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveId(null);
      if (over && active.id !== over.id) {
        const taskId = active.data?.current?.taskId ?? active.id;
        const newStatus = over.id;
        const task = (tasks || []).find((t) => t.id === taskId || String(t.id) === String(taskId));
        if (task && task.status !== newStatus) {
          onStatusChange?.(task, newStatus);
          setRecentlyDroppedId(String(taskId));
          setTimeout(() => setRecentlyDroppedId(null), 400);
        }
      }
    },
    [tasks, onStatusChange]
  );

  const activeTask =
    activeId != null ? (tasks || []).find((t) => String(t.id) === String(activeId)) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative -mx-1 px-1 py-2 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-5 min-w-0 pb-2" style={{ width: 'max-content', minWidth: '100%' }}>
          {TASK_STATUSES.map((s) => (
            <DroppableColumn
              key={s.value}
              status={s.value}
              tasks={byStatus[s.value] || []}
              assigneeNameById={assigneeNameById || {}}
              assigneePhotoById={assigneePhotoById}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onAddTask={onAddTask}
              recentlyDroppedId={recentlyDroppedId}
              statusLabel={statusLabels?.[s.value]}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            assigneeName={activeTask.assignee_id ? assigneeNameById?.[activeTask.assignee_id] : null}
            assigneePhoto={activeTask.assignee_id && assigneePhotoById ? assigneePhotoById[activeTask.assignee_id] : null}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
