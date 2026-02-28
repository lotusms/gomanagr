import { useState, useCallback } from 'react';
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

const CATEGORY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'id_documents', label: 'ID documents' },
  { value: 'logos_brand_assets', label: 'Logos / brand assets' },
  { value: 'photos', label: 'Photos' },
  { value: 'screenshots', label: 'Screenshots' },
  { value: 'intake_forms', label: 'Intake forms' },
  { value: 'signed_paperwork', label: 'Signed paperwork' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'reference_docs', label: 'Reference docs' },
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
  const [category, setCategory] = useState(initial.category ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [uploadDate, setUploadDate] = useState(toDateLocal(initial.upload_date) || toDateLocal(initial.created_at) || '');
  const [relatedItem, setRelatedItem] = useState(initial.related_item ?? '');
  const [version, setVersion] = useState(initial.version ?? '');
  const [fileUrl, setFileUrl] = useState(initial.file_url ?? '');

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
        category: category.trim() || null,
        description: description.trim(),
        upload_date: uploadDate.trim() || null,
        related_item: relatedItem.trim() || null,
        version: version.trim() || null,
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="file-name"
          label="File name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          variant="light"
          placeholder="e.g. contract-signed.pdf"
        />
        <InputField
          id="file-type"
          label="File type"
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
          variant="light"
          placeholder="e.g. PDF, image, DOC"
        />
      </div>

      <Dropdown
        id="category"
        name="category"
        label="Category / tag"
        value={category}
        onChange={(e) => setCategory(e.target.value ?? '')}
        options={CATEGORY_OPTIONS}
        placeholder="None"
        searchable={false}
      />

      <TextareaField
        id="description"
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Brief description of the file"
      />

      <DateField
        id="upload-date"
        label="Upload date"
        value={uploadDate}
        onChange={(e) => setUploadDate(e.target.value)}
        variant="light"
      />

      <InputField
        id="related-item"
        label="Related item"
        value={relatedItem}
        onChange={(e) => setRelatedItem(e.target.value)}
        variant="light"
        placeholder="e.g. Project Alpha, Invoice #123, Appointment 2024-01-15"
      />

      <InputField
        id="version"
        label="Version (optional)"
        value={version}
        onChange={(e) => setVersion(e.target.value)}
        variant="light"
        placeholder="e.g. v2, final"
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
