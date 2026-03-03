import { useState, useCallback, useEffect, useMemo } from 'react';
import InputField from '@/components/ui/InputField';
import DateField from '@/components/ui/DateField';
import Dropdown from '@/components/ui/Dropdown';
import FileUploadList from '@/components/ui/FileUploadList';
import TextareaField from '@/components/ui/TextareaField';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { ItemizedLineItems, DocumentFormHeader, FormStepNav, FormStepFooter, FormStepContent, FormStepSection } from '@/components/ui';
import { unformatCurrency, formatCurrency } from '@/utils/formatCurrency';
import { getOrgServices, updateOrgServices, getUserAccount, updateServices } from '@/services/userService';

function toDateLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'void', label: 'Void' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' },
];

export default function ClientInvoiceForm({
  initial = {},
  clientId: clientIdProp,
  userId,
  organizationId,
  invoiceId,
  defaultCurrency = 'USD',
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
  const [invoiceNumber, setInvoiceNumber] = useState(initial.invoice_number ?? '');
  const [invoiceTitle, setInvoiceTitle] = useState(initial.invoice_title ?? '');
  const [status, setStatus] = useState(initial.status ?? 'draft');
  const [step, setStep] = useState(1);
  const [invoiceIdSuggested, setInvoiceIdSuggested] = useState(false);

  const [amount, setAmount] = useState(
    initial.amount && String(initial.amount).trim() ? unformatCurrency(String(initial.amount)) : ''
  );
  const [tax, setTax] = useState(
    initial.tax && String(initial.tax).trim() ? unformatCurrency(String(initial.tax)) : ''
  );
  const [dateIssued, setDateIssued] = useState(
    toDateLocal(initial.date_issued) || toDateLocal(new Date().toISOString())
  );
  const [dueDate, setDueDate] = useState(toDateLocal(initial.due_date) || '');
  const [paidDate, setPaidDate] = useState(toDateLocal(initial.paid_date) || '');
  const [paymentMethod, setPaymentMethod] = useState(initial.payment_method ?? '');
  const [outstandingBalance, setOutstandingBalance] = useState(
    initial.outstanding_balance && String(initial.outstanding_balance).trim()
      ? unformatCurrency(String(initial.outstanding_balance))
      : ''
  );
  const [fileUrls, setFileUrls] = useState(
    Array.isArray(initial.file_urls) && initial.file_urls.length > 0
      ? initial.file_urls
      : initial.file_url
        ? [initial.file_url]
        : []
  );
  const [linkedProposalId, setLinkedProposalId] = useState(initial.related_proposal_id ?? '');
  const [linkedProject, setLinkedProject] = useState(initial.related_project ?? '');
  const [linkedContractId, setLinkedContractId] = useState(initial.linked_contract_id ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [lineItems, setLineItems] = useState(() => normalizeLineItems(initial.line_items));
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [projectOptions, setProjectOptions] = useState([{ value: '', label: 'No project' }]);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const STEPS = [
    { id: 1, label: 'Details', description: 'Dates & amounts' },
    { id: 2, label: 'Line items', description: 'What you\'re charging' },
    { id: 3, label: 'Notes & files', description: 'Attachments' },
  ];

  const clientId = showClientDropdown ? selectedClientId : clientIdProp;
  const effectiveClientId = (clientId && String(clientId).trim()) || null;

  useEffect(() => {
    if (invoiceId || !userId || !organizationId || invoiceIdSuggested) return;
    fetch('/api/get-next-document-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        organizationId: organizationId ?? undefined,
        prefix: 'INV',
        date: new Date().toISOString().slice(0, 10),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.suggestedId) {
          setInvoiceNumber(data.suggestedId);
          setInvoiceIdSuggested(true);
        }
      })
      .catch(() => {});
  }, [invoiceId, userId, organizationId, invoiceIdSuggested]);

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
    if (!effectiveClientId || !userId) return;
    setContractsLoading(true);
    fetch('/api/get-client-contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId: effectiveClientId, organizationId: organizationId || undefined }),
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

  const proposalOptions = [
    { value: '', label: 'None' },
    ...proposals.map((p) => ({
      value: p.id,
      label: [p.proposal_number, p.proposal_title].filter(Boolean).join(' – ') || 'Untitled proposal',
    })),
  ];
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
  const taxNum = parseFloat(unformatCurrency(tax)) || 0;

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
  const computedTotal = lineItems.length > 0
    ? (lineItemsSubtotal + taxNum).toFixed(2)
    : ((parseFloat(unformatCurrency(amount)) || 0) + taxNum).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const amountFromItems = lineItems.length > 0 ? String(lineItemsSubtotal.toFixed(2)) : amount.trim();
      const totalFromItems = lineItems.length > 0 ? computedTotal : computedTotal;
      const payload = {
        userId,
        clientId: effectiveClientId,
        organizationId: organizationId || undefined,
        invoice_number: invoiceNumber.trim(),
        invoice_title: invoiceTitle.trim(),
        amount: amountFromItems || amount.trim(),
        tax: tax.trim(),
        total: totalFromItems,
        date_issued: dateIssued.trim() || null,
        due_date: dueDate.trim() || null,
        paid_date: paidDate.trim() || null,
        status,
        payment_method: paymentMethod.trim(),
        outstanding_balance: outstandingBalance.trim(),
        file_urls: fileUrls.filter(Boolean).map((u) => String(u).trim()).filter(Boolean),
        related_proposal_id: linkedProposalId.trim() || null,
        related_project: linkedProject.trim() || null,
        linked_contract_id: linkedContractId.trim() || null,
        notes: notes.trim() || null,
        line_items: lineItems.map((item) => ({
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
        })),
      };

      if (invoiceId) {
        const res = await fetch('/api/update-client-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, invoiceId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update invoice');
      } else {
        const res = await fetch('/api/create-client-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create invoice');
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

      <DocumentFormHeader
        sectionLabel="Invoice"
        idPrefix="invoice"
        titleLabel="Invoice title"
        titleValue={invoiceTitle}
        titlePlaceholder="Description or reason"
        onTitleChange={(e) => setInvoiceTitle(e.target.value)}
        documentIdLabel="Invoice ID"
        documentIdValue={invoiceNumber}
        documentIdPlaceholder="Auto-generated or enter your own"
        onDocumentIdChange={(e) => setInvoiceNumber(e.target.value)}
        statusLabel="Status"
        statusValue={status}
        statusOptions={STATUS_OPTIONS}
        onStatusChange={(e) => setStatus(e.target.value ?? 'draft')}
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
        ariaLabel="Invoice form steps"
      />

      <FormStepContent>
        {step === 1 && (
          <FormStepSection title="Details" description="Dates, amounts, payment & links">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DateField id="date-issued" label="Date issued" value={dateIssued} onChange={(e) => setDateIssued(e.target.value)} variant="light" />
              <DateField id="due-date" label="Due date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} variant="light" />
              <DateField id="paid-date" label="Paid date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} variant="light" />
              {lineItems.length === 0 && (
                <CurrencyInput
                  id="amount"
                  label={`Amount (${defaultCurrency})`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ?? '')}
                  currency={defaultCurrency}
                  variant="light"
                  placeholder="0.00"
                />
              )}
              <CurrencyInput
                id="tax"
                label={`Tax (${defaultCurrency})`}
                value={tax}
                onChange={(e) => setTax(e.target.value ?? '')}
                currency={defaultCurrency}
                variant="light"
                placeholder="0.00"
              />
              <div className="text-sm">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                  {computedTotal ? formatCurrency(computedTotal, defaultCurrency) : '—'}
                </p>
              </div>
              <Dropdown
                id="payment-method"
                name="payment-method"
                label="Payment method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value ?? '')}
                options={PAYMENT_METHOD_OPTIONS}
                placeholder="None"
                searchable={false}
              />
              <CurrencyInput
                id="outstanding-balance"
                label={`Outstanding balance (${defaultCurrency})`}
                value={outstandingBalance}
                onChange={(e) => setOutstandingBalance(e.target.value ?? '')}
                currency={defaultCurrency}
                variant="light"
                placeholder="0.00"
              />
              <Dropdown
                id="linked-proposal"
                name="linked-proposal"
                label="Linked proposal"
                value={linkedProposalId}
                onChange={(e) => setLinkedProposalId(e.target.value ?? '')}
                options={proposalOptions}
                placeholder={proposalsLoading ? 'Loading…' : 'None'}
                searchable={proposalOptions.length > 10}
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
          </FormStepSection>
        )}

        {step === 2 && (
          <FormStepSection title="Line items" description="Itemize what you're charging for">
            <ItemizedLineItems
              items={lineItems}
              onChange={setLineItems}
              currency={defaultCurrency}
              itemLabel="Item"
              addLabel="Add item"
              services={services}
              onServiceCreated={saveServices}
              teamMembers={teamMembers}
            />
            {lineItems.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Leave empty to use the single Amount from Step 1. Add items to build a line-item total (subtotal + tax = total).
              </p>
            )}
          </FormStepSection>
        )}

        {step === 3 && (
          <FormStepSection title="Notes & files" description="Attachments and notes">
            <TextareaField
              id="notes"
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Include any notes here"
            />
            <FileUploadList
              id="invoice-file"
              label="Invoice files (PDF)"
              value={fileUrls}
              onChange={setFileUrls}
              onUpload={uploadFile}
              accept=".pdf,application/pdf"
              multiple={true}
              placeholder="Drag PDF here or click to upload"
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
        submitLabel={invoiceId ? 'Update invoice' : 'Add invoice'}
        saving={saving}
        submitDisabled={showClientDropdown && !effectiveClientId}
      />
    </form>
  );
}
