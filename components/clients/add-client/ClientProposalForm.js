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
  const [estimatedValue, setEstimatedValue] = useState(initial.estimated_value ?? '');
  const [scopeSummary, setScopeSummary] = useState(initial.scope_summary ?? '');
  const [includedServicesProducts, setIncludedServicesProducts] = useState(initial.included_services_products ?? '');
  const [terms, setTerms] = useState(initial.terms ?? '');
  const [fileUrl, setFileUrl] = useState(initial.file_url ?? '');
  const [linkedProject, setLinkedProject] = useState(initial.linked_project ?? '');
  const [linkedContractId, setLinkedContractId] = useState(initial.linked_contract_id ?? '');

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
        file_url: fileUrl.trim() || null,
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DateField id="date-created" label="Date created" value={dateCreated} onChange={(e) => setDateCreated(e.target.value)} variant="light" />
        <DateField id="date-sent" label="Date sent" value={dateSent} onChange={(e) => setDateSent(e.target.value)} variant="light" />
        <DateField id="expiration-date" label="Expiration date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} variant="light" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <InputField
          id="estimated-value"
          label="Estimated value"
          value={estimatedValue}
          onChange={(e) => setEstimatedValue(e.target.value)}
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

      <InputField
        id="file-url"
        label="File (PDF / document link)"
        value={fileUrl}
        onChange={(e) => setFileUrl(e.target.value)}
        variant="light"
        placeholder="URL to proposal file (upload coming later)"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="linked-project"
          label="Linked project"
          value={linkedProject}
          onChange={(e) => setLinkedProject(e.target.value)}
          variant="light"
          placeholder="Project name or reference (optional)"
        />
        <InputField
          id="linked-contract-id"
          label="Linked contract ID"
          value={linkedContractId}
          onChange={(e) => setLinkedContractId(e.target.value)}
          variant="light"
          placeholder="Contract UUID if converted (optional)"
        />
      </div>

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
