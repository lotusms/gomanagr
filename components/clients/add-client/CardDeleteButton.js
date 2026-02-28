import { HiTrash } from 'react-icons/hi';
import { IconButton } from '@/components/ui/buttons';

const DELETE_BUTTON_CLASS =
  '!p-1.5 !bg-transparent !border-transparent !text-red-500 dark:!text-red-400 hover:!text-red-600 dark:hover:!text-red-300 hover:!bg-red-100 dark:hover:!bg-red-900/40 transition-opacity rounded-lg';

/**
 * Reusable delete/remove button for log cards and list items.
 * Red icon with red hover background; stops propagation so card click doesn’t fire.
 *
 * @param {() => void} onDelete - Called when clicked (after stopPropagation/preventDefault)
 * @param {string} title - Used for title and aria-label (e.g. "Delete internal note")
 * @param {string} [className] - Extra classes (e.g. opacity, position: "opacity-60 group-hover:opacity-100" or "absolute top-3 right-3 opacity-0 group-hover:opacity-100")
 */
export default function CardDeleteButton({ onDelete, title, className = '' }) {
  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete();
  };
  return (
    <IconButton
      variant="danger"
      onClick={handleClick}
      className={`${DELETE_BUTTON_CLASS} ${className}`.trim()}
      title={title}
      aria-label={title}
    >
      <HiTrash className="w-4 h-4" />
    </IconButton>
  );
}
