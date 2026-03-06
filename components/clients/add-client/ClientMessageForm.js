import { useState, useCallback } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import DateTimeField from '@/components/ui/DateTimeField';
import { useCancelWithConfirm } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import * as Label from '@radix-ui/react-label';
import { getLabelClasses } from '@/components/ui/formControlStyles';
import * as ToggleGroup from '@radix-ui/react-toggle-group';

const CHANNEL_OPTIONS = [
  { value: 'sms', label: 'SMS' },
  { value: 'chat', label: 'Chat' },
  { value: 'other', label: 'Other' },
];

const DIRECTION_OPTIONS = [
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
];

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function fromDatetimeLocal(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export default function ClientMessageForm({
  initial = {},
  clientId,
  userId,
  organizationId,
  messageId,
  onSuccess,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [channel, setChannel] = useState(
    ['sms', 'chat', 'other'].includes(initial.channel) ? initial.channel : 'sms'
  );
  const [direction, setDirection] = useState(initial.direction === 'received' ? 'received' : 'sent');
  const [author, setAuthor] = useState(initial.author ?? '');
  const [body, setBody] = useState(initial.body ?? '');
  const [sentAt, setSentAt] = useState(toDatetimeLocal(initial.sent_at) || toDatetimeLocal(new Date().toISOString()));
  const [hasChanges, setHasChanges] = useState(false);
  const markDirty = useCallback(() => setHasChanges(true), []);
  const { handleCancel, discardDialog } = useCancelWithConfirm(onCancel, hasChanges);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        userId,
        clientId,
        organizationId: organizationId || undefined,
        channel,
        direction,
        author: author.trim(),
        body: body.trim(),
        sent_at: fromDatetimeLocal(sentAt),
      };

      if (messageId) {
        const res = await fetch('/api/update-client-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, messageId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update message');
      } else {
        const res = await fetch('/api/create-client-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create message');
      }

      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1 min-w-0 w-full">
          <Label.Root className={`${getLabelClasses('light')} mb-2 block`}>Channel</Label.Root>
          <ToggleGroup.Root
            type="single"
            value={channel}
            onValueChange={(v) => v && setChannel(v)}
            className="inline-flex flex-wrap gap-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-1"
          >
            {CHANNEL_OPTIONS.map((opt) => (
              <ToggleGroup.Item
                key={opt.value}
                value={opt.value}
                className={`flex-1 min-w-0 h-[38px] flex items-center justify-center px-4 text-sm font-medium rounded transition-all ${
                  channel === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          <Label.Root className={`${getLabelClasses('light')} mb-2 block`}>Direction</Label.Root>
          <ToggleGroup.Root
            type="single"
            value={direction}
            onValueChange={(v) => v && setDirection(v)}
            className="inline-flex h-[38px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-0.5"
          >
            {DIRECTION_OPTIONS.map((opt) => (
              <ToggleGroup.Item
                key={opt.value}
                value={opt.value}
                className={`flex-1 min-w-0 h-full flex items-center justify-center px-4 text-sm font-medium rounded transition-all ${
                  direction === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="message-author"
          label="Author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          variant="light"
          placeholder={direction === 'sent' ? 'Team member who sent (e.g. L. Silva)' : 'Client name (e.g. Mark Peck)'}
        />
        <DateTimeField
          id="message-sent-at"
          label="Date / time"
          value={sentAt}
          onChange={(e) => setSentAt(e.target.value)}
          variant="light"
        />
      </div>

      <TextareaField
        id="message-body"
        label="Message content"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder="Paste or type the message content..."
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={handleCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : messageId ? 'Update message' : 'Add message'}
        </PrimaryButton>
      </div>
      {discardDialog}
    </form>
  );
}
