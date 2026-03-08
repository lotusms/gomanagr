import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { HiOutlineDotsVertical } from 'react-icons/hi';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/config/taskConstants';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  high: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

export default function TaskCard({ task, assigneeName, onStatusChange, onDelete }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const menuButtonRef = useRef(null);
  const menuContentRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      const inTrigger = menuButtonRef.current?.contains(e.target);
      const inMenu = menuContentRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const statusLabel = TASK_STATUSES.find((s) => s.value === task.status)?.label ?? task.status;
  const priorityLabel = TASK_PRIORITIES.find((p) => p.value === task.priority)?.label ?? task.priority;
  const priorityClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;

  const openEdit = () => router.push(`/dashboard/tasks/${task.id}/edit`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openEdit();
        }
      }}
      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow p-3 cursor-pointer text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2">{task.title || 'Untitled'}</h4>
          {task.due_at && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Due {formatDateFromISO(task.due_at)}
            </p>
          )}
        </div>
        <div className="relative">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const rect = menuButtonRef.current?.getBoundingClientRect();
              if (rect) setMenuAnchorRect(rect);
              setMenuOpen((o) => !o);
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
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
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${priorityClass}`}>
          {priorityLabel}
        </span>
        {assigneeName && (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]" title={assigneeName}>
            {assigneeName}
          </span>
        )}
      </div>
    </div>
  );
}
