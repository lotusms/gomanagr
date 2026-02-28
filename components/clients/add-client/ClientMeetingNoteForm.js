import { useState } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import * as Label from '@radix-ui/react-label';
import { getLabelClasses } from '@/components/ui/formControlStyles';

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return y + '-' + m + '-' + day + 'T' + h + ':' + min;
}

function toDateLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
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
  const [meetingAt, setMeetingAt] = useState(toDatetimeLocal(initial.meeting_at) || toDatetimeLocal(new Date().toISOString()));
  const [attendees, setAttendees] = useState(initial.attendees ?? '');
  const [locationZoomLink, setLocationZoomLink] = useState(initial.location_zoom_link ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [decisionsMade, setDecisionsMade] = useState(initial.decisions_made ?? '');
  const [actionItems, setActionItems] = useState(initial.action_items ?? '');
  const [nextMeetingDate, setNextMeetingDate] = useState(toDateLocal(initial.next_meeting_date) || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        userId,
        clientId,
        organizationId: organizationId || undefined,
        title: title.trim(),
        meeting_at: meetingAt ? new Date(meetingAt).toISOString() : new Date().toISOString(),
        attendees: attendees.trim(),
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

  const labelClass = getLabelClasses('light') + ' mb-2 block';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <InputField
        id="meeting-title"
        label="Meeting title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        variant="light"
        placeholder="Meeting title"
      />

      <div>
        <Label.Root htmlFor="meeting-at" className={labelClass}>Date / time</Label.Root>
        <input
          id="meeting-at"
          type="datetime-local"
          value={meetingAt}
          onChange={(e) => setMeetingAt(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <TextareaField
        id="meeting-attendees"
        label="Attendees"
        value={attendees}
        onChange={(e) => setAttendees(e.target.value)}
        rows={2}
        placeholder="Names or emails of attendees"
      />

      <InputField
        id="meeting-location"
        label="Location / Zoom link"
        value={locationZoomLink}
        onChange={(e) => setLocationZoomLink(e.target.value)}
        variant="light"
        placeholder="Address or Zoom / Meet link"
      />

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

      <div>
        <Label.Root htmlFor="meeting-next-date" className={labelClass}>Next meeting date</Label.Root>
        <input
          id="meeting-next-date"
          type="date"
          value={nextMeetingDate}
          onChange={(e) => setNextMeetingDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>Cancel</SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : noteId ? 'Update meeting note' : 'Add meeting note'}
        </PrimaryButton>
      </div>
    </form>
  );
}
