import { useState, useEffect } from 'react';
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

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function ClientProjectForm({
  initial = {},
  clientId: clientIdProp,
  userId,
  organizationId,
  projectId,
  showClientDropdown = false,
  onSuccess,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(
    showClientDropdown ? (clientIdProp || initial.client_id || '') : ''
  );
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [projectName, setProjectName] = useState(initial.project_name ?? '');
  const [status, setStatus] = useState(initial.status ?? 'planning');
  const [startDate, setStartDate] = useState(toDateLocal(initial.start_date) || '');
  const [endDate, setEndDate] = useState(toDateLocal(initial.end_date) || '');
  const [description, setDescription] = useState(initial.description ?? '');

  const clientId = showClientDropdown ? selectedClientId : clientIdProp;
  const effectiveClientId = (clientId && String(clientId).trim()) || null;

  useEffect(() => {
    if (!showClientDropdown || !userId) return;
    setClientsLoading(true);
    fetch('/api/get-org-clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
      .then((res) => res.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
  }, [showClientDropdown, userId]);

  const clientOptions = [
    { value: '', label: 'Select client' },
    ...clients.map((c) => ({
      value: c.id,
      label: (c.name || c.companyName || 'Unnamed client').trim(),
    })),
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        userId,
        clientId: effectiveClientId,
        organizationId: organizationId || undefined,
        project_name: projectName.trim(),
        status,
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        description: description.trim(),
      };

      if (projectId) {
        const res = await fetch('/api/update-client-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            projectId,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to update project');
        }
      } else {
        const res = await fetch('/api/create-client-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to create project');
        }
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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {showClientDropdown && (
          <Dropdown
            id="client"
            name="client"
            label="Client"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value ?? '')}
            options={clientOptions}
            placeholder={clientsLoading ? 'Loading…' : 'Select client'}
            searchable={clientOptions.length > 10}
          />
        )}
        <InputField
          id="project-name"
          label="Project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          variant="light"
          placeholder="e.g. Website redesign"
        />
        <Dropdown
          id="project-status"
          name="project-status"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value ?? 'planning')}
          options={STATUS_OPTIONS}
          placeholder="Planning"
          searchable={false}
        />
        <DateField
          id="start-date"
          label="Start date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          variant="light"
        />
        <DateField
          id="end-date"
          label="End date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          variant="light"
        />
      </div>

      <TextareaField
        id="description"
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        placeholder="Brief description of the project"
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving || (showClientDropdown && !effectiveClientId)}>
          {saving ? 'Saving...' : projectId ? 'Update project' : 'Add project'}
        </PrimaryButton>
      </div>
    </form>
  );
}
