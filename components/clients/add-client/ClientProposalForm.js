import { useState, useCallback, useEffect, useMemo } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import DateField from '@/components/ui/DateField';
import Dropdown from '@/components/ui/Dropdown';
import FileUploadList from '@/components/ui/FileUploadList';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { ItemizedLineItems, DocumentFormHeader, FormStepNav, FormStepFooter, FormStepContent, FormStepSection, useToast } from '@/components/ui';
import { unformatCurrency } from '@/utils/formatCurrency';
import { getOrgServices, updateOrgServices, getUserAccount, updateServices } from '@/services/userService';

function defaultLineItem() {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    item_name: '',
    description: '',
    quantity: 1,
    unit_price: '',
    amount: '',
  };
}

function normalizeLineItems(items) {
  if (!Array.isArray(items) || items.length === 0) return [defaultLineItem()];
  return items.map((row, i) => ({
    id: row.id || `temp-${i}-${Date.now()}`,
    item_name: row.item_name ?? '',
    description: row.description ?? '',
    quantity: row.quantity ?? 1,
    unit_price: row.unit_price ?? '',
    amount: row.amount ?? '',
  }));
}

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
  clientId: clientIdProp,
  userId,
  organizationId,
  proposalId,
  defaultCurrency = 'USD',
  showClientDropdown = false,
  clientEmail: clientEmailProp,
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
  const [proposalTitle, setProposalTitle] = useState(initial.proposal_title ?? '');
  const [proposalNumber, setProposalNumber] = useState(initial.proposal_number ?? '');
  const [dateCreated, setDateCreated] = useState(
    toDateLocal(initial.date_created) || toDateLocal(new Date().toISOString())
  );
  const [dateSent, setDateSent] = useState(toDateLocal(initial.date_sent) || '');
  const [expirationDate, setExpirationDate] = useState(toDateLocal(initial.expiration_date) || '');
  const [status, setStatus] = useState(initial.status ?? 'draft');
  const [scopeSummary, setScopeSummary] = useState(initial.scope_summary ?? '');
  const [lineItems, setLineItems] = useState(() => normalizeLineItems(initial.line_items));
  const [tax, setTax] = useState(initial.tax != null && String(initial.tax).trim() !== '' ? String(initial.tax) : '');
  const [discount, setDiscount] = useState(initial.discount != null && String(initial.discount).trim() !== '' ? String(initial.discount) : '');
  const [discountType, setDiscountType] = useState('amount');
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
  const [proposalIdSuggested, setProposalIdSuggested] = useState(false);
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const toast = useToast();

  const everSent = Boolean(initial.ever_sent);
  const secondarySubmitLabel = !everSent
    ? 'Send Proposal'
    : hasUserEdited
      ? 'Save and Resend'
      : 'Resend';

  const markDirty = useCallback(() => setHasUserEdited(true), []);

  const STEPS = [
    { id: 1, label: 'Details', description: 'Dates & value' },
    { id: 2, label: 'Line items', description: 'What you\'re offering' },
    { id: 3, label: 'Attachments', description: 'Conditions & attachments' },
  ];

  const clientId = showClientDropdown ? selectedClientId : clientIdProp;
  const effectiveClientId = (clientId && String(clientId).trim()) || null;
  const clientEmailFromList = showClientDropdown && effectiveClientId
    ? (clients.find((c) => c.id === effectiveClientId)?.email ?? '')
    : '';
  const clientEmail = (clientEmailProp != null && String(clientEmailProp).trim()) !== ''
    ? String(clientEmailProp).trim()
    : (clientEmailFromList && String(clientEmailFromList).trim()) || '';
  const clientEmailTrimmed = clientEmail;

  // Prepopulate next Proposal ID when creating (editable for historical entries).
  // Only fetch when organizationId is set so we always get the org prefix (B2B: org always exists).
  useEffect(() => {
    if (proposalId || !userId || !organizationId || proposalIdSuggested) return;
    fetch('/api/get-next-document-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        organizationId: organizationId ?? undefined,
        prefix: 'PROP',
        date: new Date().toISOString().slice(0, 10),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.suggestedId) {
          setProposalNumber(data.suggestedId);
          setProposalIdSuggested(true);
        }
      })
      .catch(() => {});
  }, [proposalId, userId, organizationId, proposalIdSuggested]);

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

  useEffect(() => {
    if (!effectiveClientId || !userId) return;
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
  }, [effectiveClientId, userId, organizationId]);

  useEffect(() => {
    if (!userId) return;
    if (organizationId) {
      getOrgServices(organizationId, userId)
        .then((data) => {
          setServices(data.services || []);
          setTeamMembers(data.teamMembers || []);
        })
        .catch(() => {
          setServices([]);
          setTeamMembers([]);
        });
    } else {
      getUserAccount(userId)
        .then((account) => {
          setServices(account?.services || []);
          setTeamMembers(account?.teamMembers || []);
        })
        .catch(() => {
          setServices([]);
          setTeamMembers([]);
        });
    }
  }, [userId, organizationId]);

  const contractOptions = [
    { value: '', label: 'None' },
    ...contracts.map((c) => ({
      value: c.id,
      label: (c.contract_number || 'Untitled contract').trim() || 'Untitled contract',
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

  const lineItemsSubtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const a = parseFloat(item.amount);
      return sum + (Number.isNaN(a) ? 0 : a);
    }, 0);
  }, [lineItems]);

  const saveServices = useCallback(
    (nextServices) => {
      if (!userId) return Promise.reject(new Error('Not signed in'));
      if (organizationId) {
        return updateOrgServices(organizationId, userId, nextServices).then(() => setServices(nextServices));
      }
      return updateServices(userId, nextServices).then(() => setServices(nextServices));
    },
    [userId, organizationId]
  );

  const buildPayload = () => ({
    userId,
    clientId: effectiveClientId,
    organizationId: organizationId || undefined,
    proposal_title: proposalTitle.trim(),
    proposal_number: proposalNumber.trim(),
    date_created: dateCreated.trim() || null,
    date_sent: dateSent.trim() || null,
    expiration_date: expirationDate.trim() || null,
    status,
    scope_summary: scopeSummary.trim(),
    terms: terms.trim(),
    tax: tax.trim(),
    discount: discount.trim(),
    file_urls: fileUrls.filter(Boolean).map((u) => String(u).trim()).filter(Boolean),
    linked_project: linkedProject.trim() || null,
    linked_contract_id: linkedContractId.trim() || null,
    line_items: lineItems.map((item) => ({
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.amount,
    })),
  });

  /** Saves the proposal and returns the proposal id (existing or newly created). */
  const saveProposal = async () => {
    const payload = buildPayload();
    if (proposalId) {
      const res = await fetch('/api/update-client-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, proposalId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update proposal');
      return proposalId;
    }
    const res = await fetch('/api/create-client-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to create proposal');
    return data?.id ?? null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!proposalTitle.trim()) {
      setError('Proposal title is required.');
      return;
    }
    setSaving(true);
    try {
      await saveProposal();
      setHasUserEdited(false);
      toast.success('Proposal saved.');
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSend = async (e) => {
    e.preventDefault();
    setError('');
    if (!proposalTitle.trim()) {
      setError('Proposal title is required.');
      return;
    }
    setSaving(true);
    try {
      const id = await saveProposal();
      if (id && clientEmailTrimmed) {
        const selectedOption = clientOptions.find((o) => o.value === (showClientDropdown ? selectedClientId : clientIdProp));
        const clientNameForEmail = selectedOption?.label && selectedOption.label !== 'Select client' ? selectedOption.label : undefined;
        const sendRes = await fetch('/api/send-proposal-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            organizationId: organizationId || undefined,
            proposalId: id,
            to: clientEmailTrimmed,
            clientName: clientNameForEmail,
          }),
        });
        const sendData = await sendRes.json().catch(() => ({}));
        if (!sendRes.ok) throw new Error(sendData.error || 'Failed to send email');
        toast.success('Proposal saved and email sent to client.');
      } else {
        toast.success('Proposal saved.');
      }
      setHasUserEdited(false);
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

      <DocumentFormHeader
        sectionLabel="Proposal"
        idPrefix="proposal"
        titleLabel="Proposal title"
        titleValue={proposalTitle}
        titlePlaceholder="e.g. Website redesign proposal"
        titleRequired
        onTitleChange={(e) => { markDirty(); setProposalTitle(e.target.value); }}
        documentIdLabel="Proposal ID"
        documentIdValue={proposalNumber}
        documentIdPlaceholder="Auto-generated or enter your own"
        onDocumentIdChange={(e) => { markDirty(); setProposalNumber(e.target.value); }}
        statusLabel="Status"
        statusValue={status}
        statusOptions={STATUS_OPTIONS}
        onStatusChange={(e) => { markDirty(); setStatus(e.target.value ?? 'draft'); }}
        statusPlaceholder="Draft"
        showClientDropdown={showClientDropdown}
        selectedClientId={selectedClientId}
        onClientChange={(e) => setSelectedClientId(e.target.value ?? '')}
        clientOptions={clientOptions}
        clientsLoading={clientsLoading}
      />

      <FormStepNav
        steps={STEPS}
        currentStep={step}
        onStepChange={setStep}
        ariaLabel="Proposal form steps"
      />

      <FormStepContent>
        {step === 1 && (
          <FormStepSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DateField id="date-created" label="Date created" value={dateCreated} onChange={(e) => { markDirty(); setDateCreated(e.target.value); }} variant="light" />
              <DateField id="date-sent" label="Date sent" value={dateSent} onChange={(e) => { markDirty(); setDateSent(e.target.value); }} variant="light" />
              <DateField id="expiration-date" label="Expiration date" value={expirationDate} onChange={(e) => { markDirty(); setExpirationDate(e.target.value); }} variant="light" />
              <Dropdown
                id="linked-project"
                name="linked-project"
                label="Linked project"
                value={linkedProject}
                onChange={(e) => { markDirty(); setLinkedProject(e.target.value ?? ''); }}
                options={projectOptions}
                placeholder="Select project"
                searchable={false}
              />
              <Dropdown
                id="linked-contract"
                name="linked-contract"
                label="Linked contract"
                value={linkedContractId}
                onChange={(e) => { markDirty(); setLinkedContractId(e.target.value ?? ''); }}
                options={contractOptions}
                placeholder={contractsLoading ? 'Loading…' : 'None'}
                searchable={contractOptions.length > 10}
              />
            </div>

            <TextareaField
              id="scope-summary"
              label="Scope summary"
              value={scopeSummary}
              onChange={(e) => { markDirty(); setScopeSummary(e.target.value); }}
              rows={3}
              placeholder="Summary of scope and deliverables"
            />
          </FormStepSection>
        )}

        {step === 2 && (
          <FormStepSection>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Line items
              </label>
              <ItemizedLineItems
                items={lineItems}
                onChange={(items) => { markDirty(); setLineItems(items); }}
                currency={defaultCurrency}
                itemLabel="Service"
                addLabel="Add item"
                services={services}
                onServiceCreated={saveServices}
                teamMembers={teamMembers}
                tax={tax}
                discount={discount}
                onTaxChange={(v) => { markDirty(); setTax(v); }}
                onDiscountChange={(v) => { markDirty(); setDiscount(v); }}
                discountType={discountType}
                onDiscountTypeChange={(v) => { markDirty(); setDiscountType(v); }}
              />
            </div>
          </FormStepSection>
        )}

        {step === 3 && (
          <FormStepSection>
            <FileUploadList
              id="proposal-file"
              label="Proposal files (PDF/document)"
              value={fileUrls}
              onChange={(v) => { markDirty(); setFileUrls(v); }}
              onUpload={uploadFile}
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple={true}
              placeholder="Drag files here or click to upload"
            />
            <TextareaField
              id="terms"
              label="Terms"
              value={terms}
              onChange={(e) => { markDirty(); setTerms(e.target.value); }}
              rows={4}
              placeholder="Terms and conditions"
            />
          </FormStepSection>
        )}
      </FormStepContent>

      <FormStepFooter
        step={step}
        totalSteps={STEPS.length}
        onBack={() => setStep(step - 1)}
        onCancel={onCancel}
        onNext={() => setStep(step + 1)}
        submitLabel="Save proposal"
        onSubmitClick={() => handleSubmit({ preventDefault: () => {} })}
        saving={saving}
        submitDisabled={showClientDropdown && !effectiveClientId}
        secondarySubmitLabel={secondarySubmitLabel}
        onSecondarySubmitClick={handleSaveAndSend}
        secondarySubmitDisabled={!clientEmailTrimmed}
        noClientEmailWarning="(no email exists for this client)"
      />
    </form>
  );
}
