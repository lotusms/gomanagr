import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { HiOutlineDotsVertical } from 'react-icons/hi';
import { useDraggable } from '@dnd-kit/core';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/config/taskConstants';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import Avatar from '@/components/ui/Avatar';

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  medium: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  high: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

const PRIORITY_BORDER_COLORS = {
  low: 'border-l-gray-500 dark:border-l-gray-400',
  medium: 'border-l-sky-400 dark:border-l-sky-500',
  high: 'border-l-amber-500 dark:border-l-amber-400',
  urgent: 'border-l-red-500 dark:border-l-red-400',
};

const PRIORITY_HOVER_BG = {
  low: 'hover:bg-gray-100/50 dark:hover:bg-gray-700/50',
  medium: 'hover:bg-sky-100/50 dark:hover:bg-sky-900/50',
  high: 'hover:bg-amber-100/50 dark:hover:bg-amber-900/50',
  urgent: 'hover:bg-red-100/50 dark:hover:bg-red-900/50',
};

function CardContent({ task, assigneeName, assigneePhoto, priorityClass, priorityBorderClass, priorityLabel, showMenu, onMenuClick, onStatusChange, onDelete, openEdit, menuOpen, menuAnchorRect, menuContentRef, setMenuAnchorRect, setMenuOpen }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2">{task.title || 'Untitled'}</h4>
          {task.due_at && (
            <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              Due {formatDateFromISO(task.due_at)}
            </p>
          )}
        </div>
        {showMenu && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuAnchorRect(rect);
                setMenuOpen((o) => !o);
              }}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Task options"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <HiOutlineDotsVertical className="w-4 h-4 text-gray-500" />
            </button>
            {menuOpen && menuAnchorRect && createPortal(
              <div
                ref={menuContentRef}
                role="menu"
                className="fixed z-50 min-w-[10rem] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-1 shadow-lg"
                style={{
                  top: menuAnchorRect.bottom + 4,
                  left: menuAnchorRect.left,
                }}
              >
                {TASK_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onStatusChange?.(task, s.value);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Move to {s.label}
                  </button>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    openEdit();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Edit
                </button>
                {onDelete && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete(task);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                )}
              </div>,
              document.body
            )}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${priorityClass}`}>
          {priorityLabel}
        </span>
        {assigneeName && (
          <span title={assigneeName} className="flex-shrink-0">
            <Avatar
              src={assigneePhoto || undefined}
              name={assigneeName}
              size="sm"
              className="ring-2 ring-white dark:ring-gray-800 shadow"
            />
          </span>
        )}
      </div>
    </>
  );
}

export default function TaskCard({ task, assigneeName, assigneePhoto, onStatusChange, onDelete, isOverlay = false, recentlyDroppedId }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const menuContentRef = useRef(null);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(task.id),
    data: { taskId: task.id, status: task.status },
    disabled: isOverlay,
  });

  useEffect(() => {
    if (!menuOpen || isOverlay) return;
    const close = (e) => {
      const inMenu = menuContentRef.current?.contains(e.target);
      if (!inMenu) {
        const trigger = e.target?.closest?.('[aria-label="Task options"]');
        if (!trigger) setMenuOpen(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen, isOverlay]);

  const priorityLabel = TASK_PRIORITIES.find((p) => p.value === task.priority)?.label ?? task.priority;
  const priorityClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
  const priorityBorderClass = PRIORITY_BORDER_COLORS[task.priority] || 'border-l-gray-500 dark:border-l-gray-400';
  const priorityHoverBgClass = PRIORITY_HOVER_BG[task.priority] || 'hover:bg-gray-100/50 dark:hover:bg-gray-700/50';

  const openEdit = () => {
    if (isOverlay) return;
    if (recentlyDroppedId != null && String(task.id) === String(recentlyDroppedId)) return;
    router.push(`/dashboard/tasks/${task.id}/edit`);
  };

  const cardClassName = `group block w-full rounded-xl border-l-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow py-3 px-3.5 text-left transition-[opacity,transform,border-color,background-color] duration-150 ease-out ${priorityBorderClass} ${priorityHoverBgClass} ${
    isOverlay
      ? 'opacity-95 cursor-grabbing shadow-lg rotate-[-7deg]'
      : isDragging
        ? 'opacity-50 border-2 border-dashed border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700/50'
        : 'hover:shadow-md rounded-xl cursor-grab active:cursor-grabbing'
  }`;

  const content = (
    <CardContent
      task={task}
      assigneeName={assigneeName}
      assigneePhoto={assigneePhoto}
      priorityClass={priorityClass}
      priorityBorderClass={priorityBorderClass}
      priorityLabel={priorityLabel}
      showMenu={!isOverlay}
      onMenuClick={() => {}}
      onStatusChange={onStatusChange}
      onDelete={onDelete}
      openEdit={openEdit}
      menuOpen={menuOpen}
      menuAnchorRect={menuAnchorRect}
      menuContentRef={menuContentRef}
      setMenuAnchorRect={setMenuAnchorRect}
      setMenuOpen={setMenuOpen}
    />
  );

  if (isOverlay) {
    return (
      <div className={cardClassName} style={{ pointerEvents: 'none' }}>
        {content}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={openEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openEdit();
        }
      }}
      className={cardClassName}
      {...listeners}
      {...attributes}
    >
      {content}
    </div>
  );
}
