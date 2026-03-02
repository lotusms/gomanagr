import { useState, useCallback, useEffect } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import DateField from '@/components/ui/DateField';
import Dropdown from '@/components/ui/Dropdown';
import FileUploadList from '@/components/ui/FileUploadList';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { unformatCurrency } from '@/utils/formatCurrency';
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
  clientId: clientIdProp,
  userId,
  organizationId,
  contractId,
  showClientDropdown = false,
  defaultCurrency = 'USD',
  linkedAttachments = [],
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
  const [contractTitle, setContractTitle] = useState(initial.contract_title ?? '');
  const [contractNumber, setContractNumber] = useState(initial.contract_number ?? '');
  const [status, setStatus] = useState(initial.status ?? 'draft');
  const [contractType, setContractType] = useState(initial.contract_type ?? '');
  const [effectiveDate, setEffectiveDate] = useState(toDateLocal(initial.effective_date) || '');
  const [startDate, setStartDate] = useState(toDateLocal(initial.start_date) || '');
  const [endDate, setEndDate] = useState(toDateLocal(initial.end_date) || '');
  const [renewalDate, setRenewalDate] = useState(toDateLocal(initial.renewal_date) || '');
  const [contractValue, setContractValue] = useState(
    initial.contract_value && String(initial.contract_value).trim()
      ? unformatCurrency(String(initial.contract_value))
      : ''
  );
  const [scopeSummary, setScopeSummary] = useState(initial.scope_summary ?? '');
  const [signedBy, setSignedBy] = useState(initial.signed_by ?? '');
  const [signedDate, setSignedDate] = useState(toDateLocal(initial.signed_date) || '');
  const [fileUrls, setFileUrls] = useState(() => {
    if (initial.file_urls?.length) return Array.isArray(initial.file_urls) ? [...initial.file_urls] : [];
    if (initial.file_url && String(initial.file_url).trim()) return [String(initial.file_url).trim()];
    return [];
  });
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [relatedProposalId, setRelatedProposalId] = useState(initial.related_proposal_id ?? '');
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);

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

  useEffect(() => {
    if (!effectiveClientId || !userId) return;
    setProposalsLoading(true);
    fetch('/api/get-client-proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId: effectiveClientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setProposals(data.proposals || []))
      .catch(() => setProposals([]))
      .finally(() => setProposalsLoading(false));
  }, [effectiveClientId, userId, organizationId]);

  useEffect(() => {
    if (!organizationId || !userId) return;
    setTeamMembersLoading(true);
    fetch('/api/get-org-team-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, callerUserId: userId }),
    })
      .then((res) => res.json())
      .then((data) => setTeamMembers(data.teamMembers || []))
      .catch(() => setTeamMembers([]))
      .finally(() => setTeamMembersLoading(false));
  }, [organizationId, userId]);

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
              clientId: effectiveClientId,
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
    [userId, effectiveClientId]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        userId,
        clientId: effectiveClientId,
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
        file_urls: Array.isArray(fileUrls) ? fileUrls.filter((u) => u && String(u).trim()) : [],
        notes: notes.trim(),
        related_proposal_id: relatedProposalId.trim() || null,
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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {showClientDropdown && (
          <Dropdown
            id="client"
            name="client"
            label="Client"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value ?? '')}
            options={[
              { value: '', label: 'Select client' },
              ...clients.map((c) => ({
                value: c.id,
                label: (c.name || c.companyName || 'Unnamed client').trim(),
              })),
            ]}
            placeholder={clientsLoading ? 'Loading…' : 'Select client'}
            searchable={clients.length > 10}
          />
        )}
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

        <DateField id="start-date" label="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} variant="light" />
        <DateField id="end-date" label="End date" value={endDate} onChange={(e) => setEndDate(e.target.value)} variant="light" />
        <Dropdown
          id="related-proposal"
          name="related-proposal"
          label="Proposal"
          value={relatedProposalId}
          onChange={(e) => setRelatedProposalId(e.target.value ?? '')}
          options={[
            ...proposals.map((p) => ({
              value: p.id,
              label: [p.proposal_number, p.proposal_title].filter(Boolean).join(' – ') || 'Untitled proposal',
            })),
          ]}
          placeholder={proposalsLoading ? 'Loading…' : 'None'}
        />
        <CurrencyInput
          id="contract-value"
          label={`Contract Value (${defaultCurrency})`}
          value={contractValue}
          onChange={(e) => setContractValue(e.target.value ?? '')}
          currency={defaultCurrency}
          variant="light"
          placeholder="0.00"
        />
        <Dropdown
          id="signed-by"
          name="signed-by"
          label="Signed by (team member)"
          value={signedBy}
          onChange={(e) => setSignedBy(e.target.value ?? '')}
          options={[
            { value: '', label: 'None' },
            ...teamMembers
              .filter((m) => m.name || m.id)
              .slice()
              .sort((a, b) => (a.name || 'Unnamed').localeCompare(b.name || 'Unnamed'))
              .map((m) => ({ value: m.name || m.id, label: m.name || 'Unnamed' })),
            ...(signedBy && !teamMembers.some((m) => (m.name || m.id) === signedBy)
              ? [{ value: signedBy, label: signedBy }]
              : []),
          ]}
          placeholder={teamMembersLoading ? 'Loading…' : 'Select team member'}
          searchable={teamMembers.length > 8}
        />
        <DateField id="signed-date" label="Signed date" value={signedDate} onChange={(e) => setSignedDate(e.target.value)} variant="light" />
      </div>

      <FileUploadList
        id="contract-file"
        label="Contract files (PDF/DOC)"
        value={fileUrls}
        onChange={(urls) => setFileUrls(Array.isArray(urls) ? urls : [])}
        onUpload={uploadFile}
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple={true}
        placeholder="Drag files here or click to upload"
        linkedItems={linkedAttachments.map((att) => ({
          id: att.id,
          file_name: att.file_name || 'Unnamed file',
          file_type: att.file_type,
          href: clientId ? `/dashboard/clients/${clientId}/attachments/${att.id}/edit` : '#',
        }))}
      />

      <TextareaField
        id="scope-summary"
        label="Scope summary"
        value={scopeSummary}
        onChange={(e) => setScopeSummary(e.target.value)}
        rows={4}
        placeholder="Summary of scope and deliverables"
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
        <PrimaryButton type="submit" disabled={saving || (showClientDropdown && !effectiveClientId)}>
          {saving ? 'Saving...' : contractId ? 'Update contract' : 'Add contract'}
        </PrimaryButton>
      </div>
    </form>
  );
}
