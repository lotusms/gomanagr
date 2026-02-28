import { useState } from 'react';
import TextareaField from '@/components/ui/TextareaField';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import Checkbox from '@/components/ui/Checkbox';
import * as Label from '@radix-ui/react-label';
import { getLabelClasses } from '@/components/ui/formControlStyles';

const TAG_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'warning', label: 'Warning' },
  { value: 'preference', label: 'Preference' },
  { value: 'billing', label: 'Billing' },
  { value: 'issue', label: 'Issue' },
];

export default function ClientInternalNoteForm({
  initial = {},
  clientId,
  userId,
  organizationId,
  noteId,
  onSuccess,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState(initial.content ?? '');
  const [tag, setTag] = useState(initial.tag ?? '');
  const [isPinned, setIsPinned] = useState(Boolean(initial.is_pinned));

  const createdByLabel = noteId
    ? (initial.user_id === userId ? 'You' : 'Team member')
    : 'You';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        userId,
        clientId,
        organizationId: organizationId || undefined,
        content: content.trim(),
        tag: tag && tag !== '' ? tag : null,
        is_pinned: isPinned,
      };

      if (noteId) {
        const res = await fetch('/api/update-client-internal-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, noteId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update internal note');
      } else {
        const res = await fetch('/api/create-client-internal-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create internal note');
      }

      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const labelClass = getLabelClasses('light') + ' mb-2 block';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <TextareaField
        id="internal-note-content"
        label="Note content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        placeholder="Private note about this client…"
      />

      <div>
        <Label.Root htmlFor="internal-note-tag" className={labelClass}>
          Tag / category (optional)
        </Label.Root>
        <select
          id="internal-note-tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {TAG_OPTIONS.map((opt) => (
            <option key={opt.value || 'none'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <Checkbox
        id="internal-note-pin"
        label="Pin note?"
        checked={isPinned}
        onCheckedChange={(c) => setIsPinned(c === true)}
      />

      <div>
        <Label.Root className={labelClass}>Created by</Label.Root>
        <p className="text-sm text-gray-600 dark:text-gray-400">{createdByLabel}</p>
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>Cancel</SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : noteId ? 'Update internal note' : 'Add internal note'}
        </PrimaryButton>
      </div>
    </form>
  );
}
