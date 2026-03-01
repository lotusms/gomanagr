import { useState, useCallback, useEffect } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import DateField from '@/components/ui/DateField';
import Dropdown from '@/components/ui/Dropdown';
import FileUploadList from '@/components/ui/FileUploadList';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';

function toDateLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const FILE_TYPE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Image' },
  { value: 'document', label: 'Document' },
  { value: 'spreadsheet', label: 'Spreadsheet' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
];

export default function ClientAttachmentForm({
  initial = {},
  clientId,
  userId,
  organizationId,
  attachmentId,
  onSuccess,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState(initial.file_name ?? '');
  const [fileType, setFileType] = useState(initial.file_type ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [uploadDate, setUploadDate] = useState(toDateLocal(initial.upload_date) || toDateLocal(initial.created_at) || '');
  const [linkedProject, setLinkedProject] = useState(initial.related_item ?? '');
  const [linkedContractId, setLinkedContractId] = useState(initial.linked_contract_id ?? '');
  const [status, setStatus] = useState(initial.version ?? '');
  const [fileUrl, setFileUrl] = useState(initial.file_url ?? '');
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const projectOptions = [{ value: '', label: 'No project' }];

  useEffect(() => {
    if (!clientId || !userId) return;
    setContractsLoading(true);
    fetch('/api/get-client-contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setContracts(data.contracts || []))
      .catch(() => setContracts([]))
      .finally(() => setContractsLoading(false));
  }, [clientId, userId, organizationId]);

  const contractOptions = [
    { value: '', label: 'None' },
    ...contracts.map((c) => ({
      value: c.id,
      label: [c.contract_number, c.contract_title].filter(Boolean).join(' – ') || 'Untitled contract',
    })),
  ];

  const uploadFile = useCallback(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          fetch('/api/upload-client-attachment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              clientId,
              filename: file.name,
              contentType: file.type || 'application/octet-stream',
              base64: reader.result,
            }),
          })
            .then((res) => res.json().then((data) => ({ res, data })))
            .then(({ res, data }) => {
              if (!res.ok) throw new Error(data.error || 'Upload failed');
              resolve(data.url);
            })
            .catch(reject);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      }),
    [userId, clientId]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        userId,
        clientId,
        organizationId: organizationId || undefined,
        file_name: fileName.trim(),
        file_type: fileType.trim(),
        description: description.trim(),
        upload_date: uploadDate.trim() || null,
        related_item: linkedProject.trim() || null,
        linked_contract_id: linkedContractId.trim() || null,
        version: status.trim() || null,
        file_url: fileUrl.trim() || null,
      };

      if (attachmentId) {
        const res = await fetch('/api/update-client-attachment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, attachmentId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update attachment');
      } else {
        const res = await fetch('/api/create-client-attachment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create attachment');
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
        <InputField
          id="file-name"
          label="File name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          variant="light"
          placeholder="e.g. contract-signed.pdf"
        />
        <Dropdown
          id="file-type"
          name="file-type"
          label="File type"
          value={fileType}
          onChange={(e) => setFileType(e.target.value ?? '')}
          options={FILE_TYPE_OPTIONS}
          placeholder="None"
          searchable={false}
        />

        <Dropdown
          id="status"
          name="status"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value ?? '')}
          options={STATUS_OPTIONS}
          placeholder="Draft"
          searchable={false}
        />
        <DateField
          id="upload-date"
          label="Upload date"
          value={uploadDate}
          onChange={(e) => setUploadDate(e.target.value)}
          variant="light"
        />

        <Dropdown
          id="linked-project"
          name="linked-project"
          label="Linked project"
          value={linkedProject}
          onChange={(e) => setLinkedProject(e.target.value ?? '')}
          options={projectOptions}
          placeholder="No project"
          searchable={false}
        />

        <Dropdown
          id="linked-contract"
          name="linked-contract"
          label="Linked contract"
          value={linkedContractId}
          onChange={(e) => setLinkedContractId(e.target.value ?? '')}
          options={contractOptions}
          placeholder={contractsLoading ? 'Loading…' : 'None'}
          searchable={contractOptions.length > 10}
        />
      </div>


      <TextareaField
        id="description"
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Brief description of the file"
      />


      <FileUploadList
        id="attachment-file"
        label="File (preview / download)"
        value={fileUrl ? [fileUrl] : []}
        onChange={(urls) => setFileUrl(urls.length ? urls[0] : '')}
        onUpload={uploadFile}
        accept="*/*"
        multiple={false}
        placeholder="Drag file here or click to upload"
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : attachmentId ? 'Update attachment' : 'Add attachment'}
        </PrimaryButton>
      </div>
    </form>
  );
}
