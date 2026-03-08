import { useState, useCallback, useEffect } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import DateField from '@/components/ui/DateField';
import Dropdown from '@/components/ui/Dropdown';
import FileUploadList from '@/components/ui/FileUploadList';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { useCancelWithConfirm } from '@/components/ui';
import { unformatCurrency } from '@/utils/formatCurrency';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

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
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
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
  industry,
  onSuccess,
  onCancel,
}) {
  const clientTermPlural = getTermForIndustry(industry, 'client');
  const clientTermSingular = getTermSingular(clientTermPlural) || 'Client';
  const clientTermSingularLower = clientTermSingular.toLowerCase();
  const proposalTermPlural = getTermForIndustry(industry, 'proposal');
  const proposalTermSingular = getTermSingular(proposalTermPlural) || 'Proposal';
  const proposalTermSingularLower = proposalTermSingular.toLowerCase();
  const selectClientPlaceholder = `Select ${clientTermSingularLower}`;
  const unnamedClientLabel = `Unnamed ${clientTermSingularLower}`;
  const untitledProposalLabel = `Untitled ${proposalTermSingularLower}`;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(
    showClientDropdown ? (clientIdProp || initial.client_id || '') : ''
  );
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [contractTitle, setContractTitle] = useState(initial.contract_title ?? '');
  const [contractNumber, setContractNumber] = useState(initial.contract_number ?? '');
  const [contractIdSuggested, setContractIdSuggested] = useState(false);
  const [status, setStatus] = useState(initial.status ?? 'draft');
  const [contractType, setContractType] = useState(initial.contract_type ?? '');
  const [startDate, setStartDate] = useState(toDateLocal(initial.start_date) || '');
  const [endDate, setEndDate] = useState(toDateLocal(initial.end_date) || '');
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
  const [relatedProjectId, setRelatedProjectId] = useState(initial.related_project_id ?? '');
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const markDirty = useCallback(() => setHasChanges(true), []);
  const { handleCancel, discardDialog } = useCancelWithConfirm(onCancel, hasChanges);

  const clientId = showClientDropdown ? selectedClientId : clientIdProp;
  const effectiveClientId = (clientId && String(clientId).trim()) || null;

  const projectTermPlural = getTermForIndustry(industry, 'project');
  const projectTermSingular = getTermSingular(projectTermPlural);
  const linkedProjectLabel = `Linked ${(projectTermSingular || 'project').toLowerCase()}`;
  const unnamedProjectLabel = `Unnamed ${(projectTermSingular || 'project').toLowerCase()}`;
  const teamMemberTerm = getTermForIndustry(industry, 'teamMember');
  const teamMemberSingular = getTermSingular(teamMemberTerm);
  const teamMemberSingularLower = (teamMemberSingular || 'team member').toLowerCase();

  // Auto-suggest next Contract ID when creating (same logic as proposal/invoice); field stays editable for legacy IDs.
  useEffect(() => {
    if (contractId || !userId || !organizationId || contractIdSuggested) return;
    fetch('/api/get-next-document-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        organizationId: organizationId || undefined,
        prefix: 'CONT',
        date: startDate.trim() || new Date().toISOString().slice(0, 10),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.suggestedId) {
          setContractNumber(data.suggestedId);
          setContractIdSuggested(true);
        }
      })
      .catch(() => {});
  }, [contractId, userId, organizationId, contractIdSuggested, startDate]);

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

  // Linked proposals: when a client is selected/implied, that client's only; when no client selected, all proposals.
  useEffect(() => {
    if (!userId) return;
    setProposalsLoading(true);
    if (effectiveClientId) {
      fetch('/api/get-client-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          clientId: effectiveClientId,
          organizationId: organizationId || undefined,
        }),
      })
        .then((res) => res.json())
        .then((data) => setProposals(data.proposals || []))
        .catch(() => setProposals([]))
        .finally(() => setProposalsLoading(false));
    } else {
      fetch('/api/get-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId: organizationId || undefined }),
      })
        .then((res) => res.json())
        .then((data) => setProposals(data.proposals || []))
        .catch(() => setProposals([]))
        .finally(() => setProposalsLoading(false));
    }
  }, [effectiveClientId, userId, organizationId]);

  // Linked project: when a client is selected/implied, that client's only; when no client selected, all projects.
  useEffect(() => {
    if (!userId) return;
    setProjectsLoading(true);
    fetch('/api/get-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        organizationId: organizationId || undefined,
        clientId: effectiveClientId || undefined,
      }),
    })
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, [effectiveClientId, userId, organizationId]);

  // When a proposal is linked, set contract value from proposal total; when unlinked, clear value. Field stays disabled.
  useEffect(() => {
    if (!relatedProposalId.trim()) {
      setContractValue('');
      return;
    }
    if (!userId) return;
    fetch('/api/get-proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        organizationId: organizationId || undefined,
        proposalId: relatedProposalId.trim(),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const p = data.proposal;
        if (!p) return;
        const items = Array.isArray(p.line_items) ? p.line_items : [];
        const subtotal = items.reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0);
        const tax = parseFloat(p.tax) || 0;
        const discount = parseFloat(p.discount) || 0;
        const total = Math.max(0, subtotal + tax - discount);
        setContractValue(total > 0 ? String(total) : '');
      })
      .catch(() => {});
  }, [relatedProposalId, userId, organizationId]);

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
    if (!contractTitle.trim()) {
      setError('Contract title is required');
      return;
    }
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
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        contract_value: contractValue.trim(),
        scope_summary: scopeSummary.trim(),
        signed_by: signedBy.trim(),
        signed_date: signedDate.trim() || null,
        file_urls: Array.isArray(fileUrls) ? fileUrls.filter((u) => u && String(u).trim()) : [],
        notes: notes.trim(),
        related_proposal_id: relatedProposalId.trim() || null,
        related_project_id: relatedProjectId.trim() || null,
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
            label={clientTermSingular}
            value={selectedClientId}
            onChange={(e) => { markDirty(); setSelectedClientId(e.target.value ?? ''); }}
            options={[
              { value: '', label: selectClientPlaceholder },
              ...clients.map((c) => ({
                value: c.id,
                label: (c.name || c.companyName || unnamedClientLabel).trim(),
              })),
            ]}
            placeholder={clientsLoading ? 'Loading…' : selectClientPlaceholder}
            searchable={clients.length > 5}
          />
        )}
        <InputField
          id="contract-title"
          label="Contract title"
          value={contractTitle}
          onChange={(e) => { markDirty(); setContractTitle(e.target.value); }}
          variant="light"
          placeholder="Contract title"
          required
        />
        <InputField
          id="contract-number"
          label="Contract ID"
          value={contractNumber}
          onChange={(e) => setContractNumber(e.target.value)}
          variant="light"
          placeholder={contractId ? undefined : 'Auto-generated; editable for legacy IDs'}
        />
        <Dropdown
          id="contract-status"
          name="contract-status"
          label="Status"
          value={status}
          onChange={(e) => { markDirty(); setStatus(e.target.value ?? 'draft'); }}
          options={STATUS_OPTIONS}
          placeholder="Draft"
          searchable={false}
        />

        <Dropdown
          id="contract-type"
          name="contract-type"
          label="Contract type"
          value={contractType}
          onChange={(e) => { markDirty(); setContractType(e.target.value ?? ''); }}
          options={CONTRACT_TYPE_OPTIONS}
          placeholder="None"
          searchable={false}
        />
        <DateField id="start-date" label="Start date" value={startDate} onChange={(e) => { markDirty(); setStartDate(e.target.value); }} variant="light" />
        <DateField id="end-date" label="End date" value={endDate} onChange={(e) => { markDirty(); setEndDate(e.target.value); }} variant="light" />
        <Dropdown
          id="related-proposal"
          name="related-proposal"
          label={`Linked ${proposalTermSingularLower}`}
          value={relatedProposalId}
          onChange={(e) => { markDirty(); setRelatedProposalId(e.target.value ?? ''); }}
          options={[
            { value: '', label: 'None' },
            ...proposals.map((p) => ({
              value: p.id,
              label: (p.proposal_number || p.proposal_title || untitledProposalLabel).trim() || untitledProposalLabel,
            })),
          ]}
          placeholder={proposalsLoading ? 'Loading…' : 'None'}
          searchable={proposals.length > 5}
        />
        <CurrencyInput
          id="contract-value"
          label={`Contract value (${defaultCurrency})`}
          value={contractValue}
          onChange={(e) => { markDirty(); setContractValue(e.target.value ?? ''); }}
          currency={defaultCurrency}
          variant="light"
          placeholder={relatedProposalId ? `From linked ${proposalTermSingularLower}` : `Link a ${proposalTermSingularLower} to set value`}
          disabled
        />
        <Dropdown
          id="related-project"
          name="related-project"
          label={linkedProjectLabel}
          value={relatedProjectId}
          onChange={(e) => { markDirty(); setRelatedProjectId(e.target.value ?? ''); }}
          options={[
            { value: '', label: 'None' },
            ...projects.map((pr) => ({
              value: pr.id,
              label: (pr.project_name || pr.project_number || unnamedProjectLabel).trim() || unnamedProjectLabel,
            })),
          ]}
          placeholder={projectsLoading ? 'Loading…' : 'None'}
          searchable={projects.length > 5}
        />
        <Dropdown
          id="signed-by"
          name="signed-by"
          label={`Signed by (${teamMemberSingularLower})`}
          value={signedBy}
          onChange={(e) => { markDirty(); setSignedBy(e.target.value ?? ''); }}
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
          placeholder={teamMembersLoading ? 'Loading…' : `Select ${teamMemberSingularLower}`}
          searchable={teamMembers.length > 8}
        />
        <DateField id="signed-date" label="Signed date" value={signedDate} onChange={(e) => { markDirty(); setSignedDate(e.target.value); }} variant="light" />
      </div>

      <FileUploadList
        id="contract-file"
        label="Contract files (PDF/DOC)"
        value={fileUrls}
        onChange={(urls) => { markDirty(); setFileUrls(Array.isArray(urls) ? urls : []); }}
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
        onChange={(e) => { markDirty(); setScopeSummary(e.target.value); }}
        rows={4}
        placeholder="Summary of scope and deliverables"
      />


      <TextareaField
        id="contract-notes"
        label="Notes / special terms"
        value={notes}
        onChange={(e) => { markDirty(); setNotes(e.target.value); }}
        rows={4}
        placeholder="Notes or special terms"
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={handleCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving || (showClientDropdown && !effectiveClientId) || !contractTitle.trim()}>
          {saving ? 'Saving...' : contractId ? 'Update contract' : 'Add contract'}
        </PrimaryButton>
      </div>
      {discardDialog}
    </form>
  );
}
