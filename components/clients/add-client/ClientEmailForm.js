import { useState } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import DateField from '@/components/ui/DateField';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import * as Label from '@radix-ui/react-label';
import { getLabelClasses } from '@/components/ui/formControlStyles';
import * as ToggleGroup from '@radix-ui/react-toggle-group';

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

export default function ClientEmailForm({
  initial = {},
  clientId,
  userId,
  organizationId,
  emailId,
  onSuccess,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState(initial.subject ?? '');
  const [direction, setDirection] = useState(initial.direction === 'received' ? 'received' : 'sent');
  const [toFrom, setToFrom] = useState(initial.to_from ?? '');
  const [summary, setSummary] = useState(initial.summary ?? '');
  const [body, setBody] = useState(initial.body ?? '');
  const [attachmentsText, setAttachmentsText] = useState(
    Array.isArray(initial.attachments) ? initial.attachments.join('\n') : ''
  );
  const [sentAt, setSentAt] = useState(toDatetimeLocal(initial.sent_at) || toDatetimeLocal(new Date().toISOString()));
  const [relatedProjectCase, setRelatedProjectCase] = useState(initial.related_project_case ?? '');
  const [followUpDate, setFollowUpDate] = useState(initial.follow_up_date ?? '');

  const attachments = attachmentsText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        userId,
        clientId,
        organizationId: organizationId || undefined,
        subject: subject.trim(),
        direction,
        to_from: toFrom.trim(),
        summary: summary.trim(),
        body: body.trim(),
        attachments,
        sent_at: fromDatetimeLocal(sentAt),
        related_project_case: relatedProjectCase.trim() || undefined,
        follow_up_date: followUpDate.trim() || undefined,
      };

      if (emailId) {
        const res = await fetch('/api/update-client-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, emailId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update email');
      } else {
        const res = await fetch('/api/create-client-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create email');
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

      <InputField
        id="email-subject"
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
        variant="light"
        placeholder="Email subject"
      />

      <div>
        <Label.Root className={`${getLabelClasses('light')} mb-2 block`}>Direction</Label.Root>
        <ToggleGroup.Root
          type="single"
          value={direction}
          onValueChange={(v) => v && setDirection(v)}
          className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-0.5"
        >
          {DIRECTION_OPTIONS.map((opt) => (
            <ToggleGroup.Item
              key={opt.value}
              value={opt.value}
              className={`px-4 py-2 text-sm font-medium rounded transition-all ${
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

      <InputField
        id="email-to-from"
        label={direction === 'sent' ? 'To' : 'From'}
        value={toFrom}
        onChange={(e) => setToFrom(e.target.value)}
        variant="light"
        placeholder={direction === 'sent' ? 'Recipient(s)' : 'Sender'}
      />

      <InputField
        id="email-summary"
        label="Summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        variant="light"
        placeholder="Brief summary"
      />

      <TextareaField
        id="email-body"
        label="Full email body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        placeholder="Paste or type the full email content..."
      />

      <TextareaField
        id="email-attachments"
        label="Attachments"
        value={attachmentsText}
        onChange={(e) => setAttachmentsText(e.target.value)}
        rows={2}
        placeholder="One filename or URL per line (optional)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label.Root htmlFor="email-sent-at" className={`${getLabelClasses('light')} mb-2 block`}>
            Date / time
          </Label.Root>
          <input
            id="email-sent-at"
            type="datetime-local"
            value={sentAt}
            onChange={(e) => setSentAt(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <DateField
          id="email-follow-up"
          label="Follow-up date (optional)"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          variant="light"
        />
      </div>

      <InputField
        id="email-related"
        label="Related project / case (optional)"
        value={relatedProjectCase}
        onChange={(e) => setRelatedProjectCase(e.target.value)}
        variant="light"
        placeholder="Project or case reference"
      />

      <div className="flex flex-wrap gap-3 pt-2">
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : emailId ? 'Update email' : 'Add email'}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
