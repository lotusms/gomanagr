import { useState, useCallback } from 'react';
import TextareaField from '@/components/ui/TextareaField';
import Dropdown from '@/components/ui/Dropdown';
import Switch from '@/components/ui/Switch';
import { useCancelWithConfirm } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { getLabelClasses } from '@/components/ui/formControlStyles';
import * as Label from '@radix-ui/react-label';

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
  const [hasChanges, setHasChanges] = useState(false);
  const markDirty = useCallback(() => setHasChanges(true), []);
  const { handleCancel, discardDialog } = useCancelWithConfirm(onCancel, hasChanges);

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
    <form onSubmit={handleSubmit} onInput={markDirty} className="space-y-6">
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

      <Dropdown
        id="internal-note-tag"
        name="internal-note-tag"
        label="Tag / category (optional)"
        value={tag}
        onChange={(e) => setTag(e.target.value ?? '')}
        options={TAG_OPTIONS}
        placeholder="None"
        searchable={false}
      />

      <Switch
        id="internal-note-pin"
        label="Pin note"
        checked={isPinned}
        onCheckedChange={(c) => setIsPinned(c === true)}
      />

      <div>
        <Label.Root className={labelClass}>Created by</Label.Root>
        <p className="text-sm text-gray-600 dark:text-gray-400">{createdByLabel}</p>
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={handleCancel} disabled={saving}>Cancel</SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : noteId ? 'Update internal note' : 'Add internal note'}
        </PrimaryButton>
      </div>
      {discardDialog}
    </form>
  );
}
