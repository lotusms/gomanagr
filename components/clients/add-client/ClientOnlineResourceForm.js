import { useState } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import DateField from '@/components/ui/DateField';
import Dropdown from '@/components/ui/Dropdown';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';

function toDateLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const RESOURCE_TYPE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'client_website', label: 'Client website' },
  { value: 'google_drive_folder', label: 'Google Drive folder' },
  { value: 'dropbox_folder', label: 'Shared Dropbox folder' },
  { value: 'booking_link', label: 'Booking link' },
  { value: 'social_media_profile', label: 'Social media profile' },
  { value: 'hosting_dashboard', label: 'Hosting dashboard URL' },
  { value: 'crm_portal', label: 'CRM portal' },
  { value: 'payment_portal', label: 'Payment portal' },
  { value: 'document_signing_link', label: 'Document signing link' },
  { value: 'other', label: 'Other' },
];

export default function ClientOnlineResourceForm({
  initial = {},
  clientId,
  userId,
  organizationId,
  resourceId,
  onSuccess,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [resourceName, setResourceName] = useState(initial.resource_name ?? '');
  const [url, setUrl] = useState(initial.url ?? '');
  const [resourceType, setResourceType] = useState(initial.resource_type ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [loginEmailUsername, setLoginEmailUsername] = useState(initial.login_email_username ?? '');
  const [accessInstructions, setAccessInstructions] = useState(initial.access_instructions ?? '');
  const [dateAdded, setDateAdded] = useState(toDateLocal(initial.date_added) || toDateLocal(initial.created_at) || '');
  const [lastVerifiedDate, setLastVerifiedDate] = useState(toDateLocal(initial.last_verified_date) || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        userId,
        clientId,
        organizationId: organizationId || undefined,
        resource_name: resourceName.trim(),
        url: url.trim(),
        resource_type: resourceType.trim() || null,
        description: description.trim(),
        login_email_username: loginEmailUsername.trim() || null,
        access_instructions: accessInstructions.trim(),
        date_added: dateAdded.trim() || null,
        last_verified_date: lastVerifiedDate.trim() || null,
      };

      if (resourceId) {
        const res = await fetch('/api/update-client-online-resource', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, resourceId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update online resource');
      } else {
        const res = await fetch('/api/create-client-online-resource', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create online resource');
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="resource-name"
          label="Resource name"
          value={resourceName}
          onChange={(e) => setResourceName(e.target.value)}
          variant="light"
          placeholder="e.g. Client Google Drive"
        />
        <Dropdown
          id="resource-type"
          name="resource-type"
          label="Resource type"
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value ?? '')}
          options={RESOURCE_TYPE_OPTIONS}
          placeholder="None"
          searchable={false}
        />
      </div>

      <InputField
        id="url"
        label="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        variant="light"
        placeholder="https://..."
      />

      <TextareaField
        id="description"
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Brief description of the resource"
      />

      <InputField
        id="login-email-username"
        label="Related login email / username (optional)"
        value={loginEmailUsername}
        onChange={(e) => setLoginEmailUsername(e.target.value)}
        variant="light"
        placeholder="Login used for this resource"
      />

      <TextareaField
        id="access-instructions"
        label="Access instructions"
        value={accessInstructions}
        onChange={(e) => setAccessInstructions(e.target.value)}
        rows={3}
        placeholder="How to access (passwords, steps, etc.)"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateField
          id="date-added"
          label="Date added"
          value={dateAdded}
          onChange={(e) => setDateAdded(e.target.value)}
          variant="light"
        />
        <DateField
          id="last-verified-date"
          label="Last verified date"
          value={lastVerifiedDate}
          onChange={(e) => setLastVerifiedDate(e.target.value)}
          variant="light"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : resourceId ? 'Update resource' : 'Add resource'}
        </PrimaryButton>
      </div>
    </form>
  );
}
