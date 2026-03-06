import { useState, useMemo, useCallback } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import DateTimeField from '@/components/ui/DateTimeField';
import DateField from '@/components/ui/DateField';
import ChipsArrayBuilder from '@/components/ui/ChipsArrayBuilder';
import { useCancelWithConfirm } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';

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

function toDateLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse stored attendees (comma/newline separated) into array of trimmed strings. */
function parseAttendeesString(str) {
  if (!str || typeof str !== 'string') return [];
  return str
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Simple email validation for attendee chips (emails only). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(s) {
  return EMAIL_REGEX.test(String(s).trim());
}

export default function ClientMeetingNoteForm({
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
  const [title, setTitle] = useState(initial.title ?? '');
  const [meetingAt, setMeetingAt] = useState(
    toDatetimeLocal(initial.meeting_at) || toDatetimeLocal(new Date().toISOString())
  );
  const attendeesInitial = useMemo(
    () => parseAttendeesString(initial.attendees),
    [initial.attendees]
  );
  const [attendeesList, setAttendeesList] = useState(attendeesInitial);
  const [attendeeError, setAttendeeError] = useState('');
  const [locationZoomLink, setLocationZoomLink] = useState(initial.location_zoom_link ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [decisionsMade, setDecisionsMade] = useState(initial.decisions_made ?? '');
  const [actionItems, setActionItems] = useState(initial.action_items ?? '');
  const [nextMeetingDate, setNextMeetingDate] = useState(
    toDateLocal(initial.next_meeting_date) || ''
  );
  const [hasChanges, setHasChanges] = useState(false);
  const markDirty = useCallback(() => setHasChanges(true), []);
  const { handleCancel, discardDialog } = useCancelWithConfirm(onCancel, hasChanges);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAttendeeError('');
    setSaving(true);
    try {
      const payload = {
        userId,
        clientId,
        organizationId: organizationId || undefined,
        title: title.trim(),
        meeting_at: meetingAt ? new Date(meetingAt).toISOString() : new Date().toISOString(),
        attendees: attendeesList.join(', '),
        location_zoom_link: locationZoomLink.trim(),
        notes: notes.trim(),
        decisions_made: decisionsMade.trim(),
        action_items: actionItems.trim(),
        next_meeting_date: nextMeetingDate.trim() || null,
      };

      if (noteId) {
        const res = await fetch('/api/update-client-meeting-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, noteId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update meeting note');
      } else {
        const res = await fetch('/api/create-client-meeting-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create meeting note');
      }

      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} onInput={markDirty} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2  gap-4">
        <InputField
          id="meeting-title"
          label="Meeting title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          variant="light"
          placeholder="Meeting title"
        />
        <DateTimeField
          id="meeting-at"
          label="Date / time"
          value={meetingAt}
          onChange={(e) => setMeetingAt(e.target.value)}
          variant="light"
        />
        <div>
          <ChipsArrayBuilder
            id="meeting-attendees"
            label="Attendees"
            value={attendeesList}
            onChange={(list) => {
              setAttendeesList(list);
              setAttendeeError('');
            }}
            placeholder="Attendee email"
            addButtonLabel="Add attendee"
            validateItem={isValidEmail}
            onInvalidItem={() => setAttendeeError('Please enter a valid email address.')}
            disabled={saving}
          />
          {attendeeError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {attendeeError}
            </p>
          )}
        </div>

        <InputField
          id="meeting-location"
          label="Location / Zoom link"
          value={locationZoomLink}
          onChange={(e) => setLocationZoomLink(e.target.value)}
          variant="light"
          placeholder="Address or Zoom / Meet link"
        />
      </div>

      <TextareaField
        id="meeting-notes"
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        placeholder="Meeting notes..."
      />

      <TextareaField
        id="meeting-decisions"
        label="Decisions made"
        value={decisionsMade}
        onChange={(e) => setDecisionsMade(e.target.value)}
        rows={3}
        placeholder="Key decisions from the meeting"
      />

      <TextareaField
        id="meeting-action-items"
        label="Action items"
        value={actionItems}
        onChange={(e) => setActionItems(e.target.value)}
        rows={3}
        placeholder="Action items and owners"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <DateField
          id="meeting-next-date"
          label="Next meeting date"
          value={nextMeetingDate}
          onChange={(e) => setNextMeetingDate(e.target.value)}
          variant="light"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={handleCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : noteId ? 'Update meeting note' : 'Add meeting note'}
        </PrimaryButton>
      </div>
      {discardDialog}
    </form>
  );
}
