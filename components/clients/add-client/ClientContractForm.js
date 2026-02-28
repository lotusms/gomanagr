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

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'signed', label: 'Signed' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
];

const CONTRACT_TYPE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'service_agreement', label: 'Service agreement' },
  { value: 'retainer_agreement', label: 'Retainer agreement' },
  { value: 'maintenance_agreement', label: 'Maintenance agreement' },
  { value: 'nda', label: 'NDA' },
  { value: 'vendor_agreement', label: 'Vendor agreement' },
];

export default function ClientContractForm({
  initial = {},
  clientId,
  userId,
  organizationId,
  contractId,
  onSuccess,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [contractTitle, setContractTitle] = useState(initial.contract_title ?? '');
  const [contractNumber, setContractNumber] = useState(initial.contract_number ?? '');
  const [status, setStatus] = useState(initial.status ?? 'draft');
  const [contractType, setContractType] = useState(initial.contract_type ?? '');
  const [effectiveDate, setEffectiveDate] = useState(toDateLocal(initial.effective_date) || '');
  const [startDate, setStartDate] = useState(toDateLocal(initial.start_date) || '');
  const [endDate, setEndDate] = useState(toDateLocal(initial.end_date) || '');
  const [renewalDate, setRenewalDate] = useState(toDateLocal(initial.renewal_date) || '');
  const [contractValue, setContractValue] = useState(initial.contract_value ?? '');
  const [scopeSummary, setScopeSummary] = useState(initial.scope_summary ?? '');
  const [signedBy, setSignedBy] = useState(initial.signed_by ?? '');
  const [signedDate, setSignedDate] = useState(toDateLocal(initial.signed_date) || '');
  const [fileUrl, setFileUrl] = useState(initial.file_url ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');

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
        contract_title: contractTitle.trim(),
        contract_number: contractNumber.trim(),
        status,
        contract_type: contractType.trim() || null,
        effective_date: effectiveDate.trim() || null,
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        renewal_date: renewalDate.trim() || null,
        contract_value: contractValue.trim(),
        scope_summary: scopeSummary.trim(),
        signed_by: signedBy.trim(),
        signed_date: signedDate.trim() || null,
        file_url: fileUrl.trim() || null,
        notes: notes.trim(),
      };

      if (contractId) {
        const res = await fetch('/api/update-client-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, contractId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update contract');
      } else {
        const res = await fetch('/api/create-client-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create contract');
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InputField
          id="contract-title"
          label="Contract title"
          value={contractTitle}
          onChange={(e) => setContractTitle(e.target.value)}
          variant="light"
          placeholder="Contract title"
        />
        <InputField
          id="contract-number"
          label="Contract number / reference ID"
          value={contractNumber}
          onChange={(e) => setContractNumber(e.target.value)}
          variant="light"
          placeholder="Reference ID"
        />
        <Dropdown
          id="contract-status"
          name="contract-status"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value ?? 'draft')}
          options={STATUS_OPTIONS}
          placeholder="Draft"
          searchable={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Dropdown
          id="contract-type"
          name="contract-type"
          label="Contract type"
          value={contractType}
          onChange={(e) => setContractType(e.target.value ?? '')}
          options={CONTRACT_TYPE_OPTIONS}
          placeholder="None"
          searchable={false}
        />
        <DateField id="effective-date" label="Effective date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} variant="light" />
        <DateField id="renewal-date" label="Renewal date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} variant="light" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DateField id="start-date" label="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} variant="light" />
        <DateField id="end-date" label="End date" value={endDate} onChange={(e) => setEndDate(e.target.value)} variant="light" />
        <InputField
          id="contract-value"
          label="Contract value"
          value={contractValue}
          onChange={(e) => setContractValue(e.target.value)}
          variant="light"
          placeholder="e.g. $5,000 or 5,000 USD"
        />
      </div>


      <TextareaField
        id="scope-summary"
        label="Scope summary"
        value={scopeSummary}
        onChange={(e) => setScopeSummary(e.target.value)}
        rows={4}
        placeholder="Summary of scope and deliverables"
      />

      {/*  Should be a dropdown with team members in it */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="signed-by"
          label="Signed by"
          value={signedBy}
          onChange={(e) => setSignedBy(e.target.value)}
          variant="light"
          placeholder="Name or role"
        />
        <DateField id="signed-date" label="Signed date" value={signedDate} onChange={(e) => setSignedDate(e.target.value)} variant="light" />
      </div>

      <FileUploadList
        id="contract-file"
        label="Contract file (PDF/DOC)"
        value={fileUrl ? [fileUrl] : []}
        onChange={(urls) => setFileUrl(urls.length ? urls[0] : '')}
        onUpload={uploadFile}
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple={false}
        placeholder="Drag file here or click to upload"
      />

      <TextareaField
        id="contract-notes"
        label="Notes / special terms"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Notes or special terms"
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : contractId ? 'Update contract' : 'Add contract'}
        </PrimaryButton>
      </div>
    </form>
  );
}
