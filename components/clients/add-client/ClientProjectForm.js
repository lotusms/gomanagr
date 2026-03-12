import { useState, useEffect, useCallback, forwardRef } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import DateField from '@/components/ui/DateField';
import Dropdown from '@/components/ui/Dropdown';
import FileUploadList from '@/components/ui/FileUploadList';
import { useCancelWithConfirm } from '@/components/ui';
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
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
];

const ClientProjectForm = forwardRef(function ClientProjectForm({
  initial = {},
  clientId: clientIdProp,
  userId,
  organizationId,
  projectId,
  showClientDropdown = false,
  linkedAttachments = [],
  industry = null,
  onSuccess,
  onCancel,
  onHasChangesChange,
}, ref) {
  const projectTermPlural = getTermForIndustry(industry, 'project');
  const projectTermSingular = getTermSingular(projectTermPlural) || 'Project';
  const projectTitleLabel = `${projectTermSingular} title`;
  const projectIdLabel = `${projectTermSingular} ID`;
  const projectOwnerLabel = getTermForIndustry(industry, 'project_owner') || 'Project Owner';
  const projectTitleRequiredError = `${projectTermSingular} title is required`;
  const projectFilesLabel = `${projectTermSingular} files`;
  const projectTermSingularLower = projectTermSingular.toLowerCase();
  const updateProjectLabel = `Update ${projectTermSingularLower}`;
  const addProjectLabel = `Add ${projectTermSingularLower}`;
  const teamMemberTerm = getTermForIndustry(industry, 'teamMember');
  const teamMemberSingular = getTermSingular(teamMemberTerm) || 'Team Member';
  const selectTeamMemberPlaceholder = `Select ${teamMemberSingular.toLowerCase()}`;
  const clientTermPlural = getTermForIndustry(industry, 'client');
  const clientTermSingular = getTermSingular(clientTermPlural) || 'Client';
  const clientTermSingularLower = clientTermSingular.toLowerCase();
  const selectClientPlaceholder = `Select ${clientTermSingularLower}`;
  const unnamedClientLabel = `Unnamed ${clientTermSingularLower}`;
  const proposalTermPlural = getTermForIndustry(industry, 'proposal');
  const proposalTermSingular = getTermSingular(proposalTermPlural) || 'Proposal';
  const proposalTermSingularLower = proposalTermSingular.toLowerCase();
  const contractTermPlural = getTermForIndustry(industry, 'contract');
  const contractTermSingular = getTermSingular(contractTermPlural) || 'Contract';
  const contractTermSingularLower = contractTermSingular.toLowerCase();
  const untitledProposalLabel = `Untitled ${proposalTermSingularLower}`;
  const untitledContractLabel = `Untitled ${contractTermSingularLower}`;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(
    showClientDropdown ? (clientIdProp || initial.client_id || '') : ''
  );
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [projectName, setProjectName] = useState(initial.project_name ?? '');
  const [projectNumber, setProjectNumber] = useState(initial.project_number ?? '');
  const [projectIdSuggested, setProjectIdSuggested] = useState(false);
  const [status, setStatus] = useState(initial.status ?? 'draft');
  const [startDate, setStartDate] = useState(toDateLocal(initial.start_date) || '');
  const [endDate, setEndDate] = useState(toDateLocal(initial.end_date) || '');
  const [scopeSummary, setScopeSummary] = useState(
    (initial.scope_summary ?? initial.description ?? '').toString()
  );
  const [projectOwner, setProjectOwner] = useState(initial.project_owner ?? '');
  const [relatedProposalId, setRelatedProposalId] = useState(initial.related_proposal_id ?? '');
  const [relatedContractId, setRelatedContractId] = useState(initial.related_contract_id ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [fileUrls, setFileUrls] = useState(() => {
    if (initial.file_urls?.length) return Array.isArray(initial.file_urls) ? [...initial.file_urls] : [];
    return [];
  });
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const markDirty = useCallback(() => setHasChanges(true), []);
  const { handleCancel, discardDialog } = useCancelWithConfirm(onCancel, hasChanges);
  useEffect(() => {
    onHasChangesChange?.(hasChanges);
  }, [hasChanges, onHasChangesChange]);

  const clientId = showClientDropdown ? selectedClientId : clientIdProp;
  const effectiveClientId = (clientId && String(clientId).trim()) || null;

  // Auto-suggest next Project ID when creating (nomenclature: PROJ prefix). Requires organizationId so we never use PER.
  useEffect(() => {
    if (projectId || !userId || !organizationId || projectIdSuggested) return;
    const datePart = startDate.trim() || new Date().toISOString().slice(0, 10);
    fetch('/api/get-next-document-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        organizationId,
        prefix: 'PROJ',
        date: datePart,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.suggestedId) {
          setProjectNumber(data.suggestedId);
          setProjectIdSuggested(true);
        }
      })
      .catch(() => {});
  }, [projectId, userId, organizationId, projectIdSuggested, startDate]);

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

  // Linked contracts: when a client is selected/implied, that client's only; when no client selected, all contracts.
  useEffect(() => {
    if (!userId) return;
    setContractsLoading(true);
    fetch('/api/get-contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        organizationId: organizationId || undefined,
        clientId: effectiveClientId || undefined,
      }),
    })
      .then((res) => res.json())
      .then((data) => setContracts(data.contracts || []))
      .catch(() => setContracts([]))
      .finally(() => setContractsLoading(false));
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
    if (!projectName.trim()) {
      setError(projectTitleRequiredError);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        userId,
        clientId: effectiveClientId,
        organizationId: organizationId || undefined,
        project_name: projectName.trim(),
        project_number: projectNumber.trim() || undefined,
        status,
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        scope_summary: scopeSummary.trim(),
        project_owner: projectOwner.trim(),
        related_proposal_id: relatedProposalId.trim() || null,
        related_contract_id: relatedContractId.trim() || null,
        notes: notes.trim(),
        file_urls: Array.isArray(fileUrls) ? fileUrls.filter((u) => u && String(u).trim()) : [],
      };

      if (projectId) {
        const res = await fetch('/api/update-client-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, projectId }),
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
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
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
          id="project-title"
          label={projectTitleLabel}
          value={projectName}
          onChange={(e) => { markDirty(); setProjectName(e.target.value); }}
          variant="light"
          placeholder="e.g. Website redesign"
          required
        />
        <InputField
          id="project-number"
          label={projectIdLabel}
          value={projectNumber}
          onChange={(e) => setProjectNumber(e.target.value)}
          variant="light"
          placeholder={projectId ? undefined : 'Auto-generated; editable for legacy IDs'}
        />
        <Dropdown
          id="project-status"
          name="project-status"
          label="Status"
          value={status}
          onChange={(e) => { markDirty(); setStatus(e.target.value ?? 'draft'); }}
          options={STATUS_OPTIONS}
          placeholder="Draft"
          searchable={false}
        />
        <DateField
          id="start-date"
          label="Start date"
          value={startDate}
          onChange={(e) => { markDirty(); setStartDate(e.target.value); }}
          variant="light"
        />
        <DateField
          id="end-date"
          label="End date"
          value={endDate}
          onChange={(e) => { markDirty(); setEndDate(e.target.value); }}
          variant="light"
        />
        <Dropdown
          id="project-owner"
          name="project-owner"
          label={projectOwnerLabel}
          value={projectOwner}
          onChange={(e) => { markDirty(); setProjectOwner(e.target.value ?? ''); }}
          options={[
            { value: '', label: 'None' },
            ...teamMembers
              .filter((m) => m.name || m.id)
              .slice()
              .sort((a, b) => (a.name || 'Unnamed').localeCompare(b.name || 'Unnamed'))
              .map((m) => ({ value: m.name || m.id, label: m.name || 'Unnamed' })),
            ...(projectOwner && !teamMembers.some((m) => (m.name || m.id) === projectOwner)
              ? [{ value: projectOwner, label: projectOwner }]
              : []),
          ]}
          placeholder={teamMembersLoading ? 'Loading…' : selectTeamMemberPlaceholder}
          searchable={teamMembers.length > 8}
        />
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
        <Dropdown
          id="related-contract"
          name="related-contract"
          label={`Linked ${contractTermSingularLower}`}
          value={relatedContractId}
          onChange={(e) => { markDirty(); setRelatedContractId(e.target.value ?? ''); }}
          options={[
            { value: '', label: 'None' },
            ...contracts.map((c) => ({
              value: c.id,
              label: (c.contract_number || c.contract_title || untitledContractLabel).trim() || untitledContractLabel,
            })),
          ]}
          placeholder={contractsLoading ? 'Loading…' : 'None'}
          searchable={contracts.length > 5}
        />
      </div>

      <FileUploadList
        id="project-files"
        label={projectFilesLabel}
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
          href: effectiveClientId ? `/dashboard/clients/${effectiveClientId}/attachments/${att.id}/edit` : '#',
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
        id="project-notes"
        label="Notes / Special terms"
        value={notes}
        onChange={(e) => { markDirty(); setNotes(e.target.value); }}
        rows={4}
        placeholder="Notes or special terms"
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={handleCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving || (showClientDropdown && !effectiveClientId) || !projectName.trim()}>
          {saving ? 'Saving...' : projectId ? updateProjectLabel : addProjectLabel}
        </PrimaryButton>
      </div>
      {discardDialog}
    </form>
  );
});
export default ClientProjectForm;
