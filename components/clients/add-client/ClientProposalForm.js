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
  { value: 'viewed', label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

export default function ClientProposalForm({
  initial = {},
  clientId,
  userId,
  organizationId,
  proposalId,
  defaultCurrency = 'USD',
  onSuccess,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [proposalTitle, setProposalTitle] = useState(initial.proposal_title ?? '');
  const [proposalNumber, setProposalNumber] = useState(initial.proposal_number ?? '');
  const [dateCreated, setDateCreated] = useState(toDateLocal(initial.date_created) || '');
  const [dateSent, setDateSent] = useState(toDateLocal(initial.date_sent) || '');
  const [expirationDate, setExpirationDate] = useState(toDateLocal(initial.expiration_date) || '');
  const [status, setStatus] = useState(initial.status ?? 'draft');
  const [estimatedValue, setEstimatedValue] = useState(
    initial.estimated_value && String(initial.estimated_value).trim()
      ? unformatCurrency(String(initial.estimated_value))
      : ''
  );
  const [scopeSummary, setScopeSummary] = useState(initial.scope_summary ?? '');
  const [includedServicesProducts, setIncludedServicesProducts] = useState(initial.included_services_products ?? '');
  const [terms, setTerms] = useState(initial.terms ?? '');
  const [fileUrls, setFileUrls] = useState(
    Array.isArray(initial.file_urls) && initial.file_urls.length > 0
      ? initial.file_urls
      : initial.file_url
        ? [initial.file_url]
        : []
  );
  const [linkedProject, setLinkedProject] = useState(initial.linked_project ?? '');
  const [linkedContractId, setLinkedContractId] = useState(initial.linked_contract_id ?? '');
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [projectOptions, setProjectOptions] = useState([]);

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
        proposal_title: proposalTitle.trim(),
        proposal_number: proposalNumber.trim(),
        date_created: dateCreated.trim() || null,
        date_sent: dateSent.trim() || null,
        expiration_date: expirationDate.trim() || null,
        status,
        estimated_value: estimatedValue.trim(),
        scope_summary: scopeSummary.trim(),
        included_services_products: includedServicesProducts.trim(),
        terms: terms.trim(),
        file_urls: fileUrls.filter(Boolean).map((u) => String(u).trim()).filter(Boolean),
        linked_project: linkedProject.trim() || null,
        linked_contract_id: linkedContractId.trim() || null,
      };

      if (proposalId) {
        const res = await fetch('/api/update-client-proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, proposalId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update proposal');
      } else {
        const res = await fetch('/api/create-client-proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create proposal');
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
          id="proposal-title"
          label="Proposal title"
          value={proposalTitle}
          onChange={(e) => setProposalTitle(e.target.value)}
          variant="light"
          placeholder="e.g. Website redesign proposal"
        />
        <InputField
          id="proposal-number"
          label="Proposal number / reference ID"
          value={proposalNumber}
          onChange={(e) => setProposalNumber(e.target.value)}
          variant="light"
          placeholder="Reference ID"
        />
        <Dropdown
          id="proposal-status"
          name="proposal-status"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value ?? 'draft')}
          options={STATUS_OPTIONS}
          placeholder="Draft"
          searchable={false}
        />
        <DateField id="date-created" label="Date created" value={dateCreated} onChange={(e) => setDateCreated(e.target.value)} variant="light" />
        <DateField id="date-sent" label="Date sent" value={dateSent} onChange={(e) => setDateSent(e.target.value)} variant="light" />
        <DateField id="expiration-date" label="Expiration date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} variant="light" />
        <CurrencyInput
          id="estimated-value"
          label={`Estimated value (${defaultCurrency})`}
          value={estimatedValue}
          onChange={(e) => setEstimatedValue(e.target.value ?? '')}
          currency={defaultCurrency}
          variant="light"
          placeholder="0.00"
        />
        <Dropdown
          id="linked-project"
          name="linked-project"
          label="Linked project"
          value={linkedProject}
          onChange={(e) => setLinkedProject(e.target.value ?? '')}
          options={projectOptions}
          placeholder="Select project"
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
        id="scope-summary"
        label="Scope summary"
        value={scopeSummary}
        onChange={(e) => setScopeSummary(e.target.value)}
        rows={4}
        placeholder="Summary of scope and deliverables"
      />

      <TextareaField
        id="included-services-products"
        label="Included services / products"
        value={includedServicesProducts}
        onChange={(e) => setIncludedServicesProducts(e.target.value)}
        rows={4}
        placeholder="List services or products included in this proposal"
      />

      <TextareaField
        id="terms"
        label="Terms"
        value={terms}
        onChange={(e) => setTerms(e.target.value)}
        rows={4}
        placeholder="Terms and conditions"
      />

      <FileUploadList
        id="proposal-file"
        label="Proposal files (PDF/document)"
        value={fileUrls}
        onChange={setFileUrls}
        onUpload={uploadFile}
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple={true}
        placeholder="Drag files here or click to upload"
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : proposalId ? 'Update proposal' : 'Add proposal'}
        </PrimaryButton>
      </div>
    </form>
  );
}
