import { TextareaField } from '@/components/ui';

/**
 * Internal notes card: private textarea with amber styling and disclaimer.
 * Used in Communication Log for the "Internal notes" section.
 *
 * @param {string} value - Current notes value
 * @param {(e: React.ChangeEvent<HTMLTextAreaElement>) => void} onChange - Called when value changes
 */
export default function InternalNotesView({ value, onChange }) {
  return (
    <div className="rounded-xl border border-amber-200/40 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-900/10 p-4">
      <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">Private—not visible to client</p>
      <TextareaField
        id="internalNotes"
        value={value}
        onChange={onChange}
        placeholder="Private notes about this client—reminders, preferences, follow-ups..."
        rows={8}
        variant="light"
      />
    </div>
  );
}
