import { useState } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import DateTimeField from '@/components/ui/DateTimeField';
import PhoneNumberInput from '@/components/ui/PhoneNumberInput';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import * as Label from '@radix-ui/react-label';
import { getLabelClasses } from '@/components/ui/formControlStyles';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { formatPhone } from '@/utils/formatPhone';

const DIRECTION_OPTIONS = [
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
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

export default function ClientCallForm({
  initial = {},
  clientId,
  userId,
  organizationId,
  callId,
  onSuccess,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState(
    ['incoming', 'outgoing'].includes(initial.direction) ? initial.direction : 'outgoing'
  );
  const [phoneNumber, setPhoneNumber] = useState(initial.phone_number ? formatPhone(initial.phone_number) : '');
  const [duration, setDuration] = useState(initial.duration ?? '');
  const [summary, setSummary] = useState(initial.summary ?? '');
  const [outcome, setOutcome] = useState(
    ['no_answer', 'left_voicemail', 'resolved', 'follow_up_needed'].includes(initial.outcome) ? initial.outcome : 'resolved'
  );
  const [followUpAt, setFollowUpAt] = useState(toDatetimeLocal(initial.follow_up_at) || '');
  const [teamMember, setTeamMember] = useState(initial.team_member ?? '');
  const [calledAt, setCalledAt] = useState(toDatetimeLocal(initial.called_at) || toDatetimeLocal(new Date().toISOString()));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        userId,
        clientId,
        organizationId: organizationId || undefined,
        direction,
        phone_number: phoneNumber.trim(),
        duration: duration.trim(),
        summary: summary.trim(),
        follow_up_at: followUpAt ? fromDatetimeLocal(followUpAt) : null,
        called_at: fromDatetimeLocal(calledAt),
      };

      if (callId) {
        const res = await fetch('/api/update-client-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, callId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update call');
      } else {
        const res = await fetch('/api/create-client-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create call');
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
        <div className="flex-shrink-0 w-full sm:w-auto">
          <Label.Root className={getLabelClasses('light') + ' mb-2 block'}>Call direction</Label.Root>
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
                className={'flex-1 min-w-0 h-full flex items-center justify-center px-4 text-sm font-medium rounded transition-all ' +
                  (direction === opt.value ? 'bg-primary-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600')}
              >
                {opt.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PhoneNumberInput
          id="call-phone"
          label="Phone number"
          value={phoneNumber}
          onChange={setPhoneNumber}
          variant="light"
          placeholder="(717) 123-4567"
        />
        <InputField
          id="call-duration"
          label="Duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          variant="light"
          placeholder="e.g. 5 min"
        />
        <DateTimeField
          id="call-called-at"
          label="Date / time"
          value={calledAt}
          onChange={(e) => setCalledAt(e.target.value)}
          variant="light"
        />
      </div>

      <TextareaField
        id="call-summary"
        label="Call summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={5}
        placeholder="Summarize the call..."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DateTimeField
          id="call-follow-up"
          label="Follow-up date / time"
          value={followUpAt}
          onChange={(e) => setFollowUpAt(e.target.value)}
          variant="light"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : callId ? 'Update call' : 'Add call'}
        </PrimaryButton>
      </div>
    </form>
  );
}
