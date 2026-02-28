import CardDeleteButton from './CardDeleteButton';

/**
 * Single communication log entry card: textarea + remove button.
 * Used for Messages, Calls, and Meeting notes in CommunicationLogSection.
 *
 * @param {string} id - Input id for the textarea
 * @param {string} value - Current text value
 * @param {(value: string) => void} onChange - Called when text changes
 * @param {() => void} onRemove - Called when user clicks remove
 * @param {string} ariaLabel - Accessible label for the textarea
 * @param {string} borderClass - Tailwind border class for the left accent
 */
export default function LogEntryCard({ id, value, onChange, onRemove, ariaLabel, borderClass }) {
  return (
    <div
      className={`group relative rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${borderClass} pl-4 pr-11 py-3 min-h-[56px]`}
    >
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="Add details..."
        className="w-full text-sm min-h-[2.5rem] resize-y bg-transparent border-0 py-0 px-0 focus:ring-0 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
        aria-label={ariaLabel}
      />
      <CardDeleteButton
        onDelete={onRemove}
        title="Remove entry"
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}
