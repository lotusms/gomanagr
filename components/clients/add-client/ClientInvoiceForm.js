import { useState, useCallback, useEffect } from 'react';
import InputField from '@/components/ui/InputField';
import DateField from '@/components/ui/DateField';
import Dropdown from '@/components/ui/Dropdown';
import FileUploadList from '@/components/ui/FileUploadList';
import TextareaField from '@/components/ui/TextareaField';
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
  clientId,
  userId,
  organizationId,
  invoiceId,
  defaultCurrency = 'USD',
  onSuccess,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(initial.invoice_number ?? '');
  const [invoiceTitle, setInvoiceTitle] = useState(initial.invoice_title ?? '');
  const [amount, setAmount] = useState(
    initial.amount && String(initial.amount).trim() ? unformatCurrency(String(initial.amount)) : ''
  );
  const [tax, setTax] = useState(
    initial.tax && String(initial.tax).trim() ? unformatCurrency(String(initial.tax)) : ''
  );
  // Total is computed from amount + tax (display-only, disabled field)
  const amountNum = parseFloat(unformatCurrency(amount)) || 0;
  const taxNum = parseFloat(unformatCurrency(tax)) || 0;
  const computedTotal = (amountNum + taxNum).toFixed(2);
  const [dateIssued, setDateIssued] = useState(toDateLocal(initial.date_issued) || '');
  const [dueDate, setDueDate] = useState(toDateLocal(initial.due_date) || '');
  const [paidDate, setPaidDate] = useState(toDateLocal(initial.paid_date) || '');
  const [status, setStatus] = useState(initial.status ?? 'draft');
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
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [projectOptions, setProjectOptions] = useState([{ value: '', label: 'No project' }]);

  useEffect(() => {
    if (!clientId || !userId) return;
    setProposalsLoading(true);
    fetch('/api/get-client-proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setProposals(data.proposals || []))
      .catch(() => setProposals([]))
      .finally(() => setProposalsLoading(false));
  }, [clientId, userId, organizationId]);

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
        invoice_number: invoiceNumber.trim(),
        invoice_title: invoiceTitle.trim(),
        amount: amount.trim(),
        tax: tax.trim(),
        total: computedTotal,
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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <InputField
          id="invoice-title"
          label="Invoice title / reason"
          value={invoiceTitle}
          onChange={(e) => setInvoiceTitle(e.target.value)}
          variant="light"
          placeholder="Description or reason"
        />
        <InputField
          id="invoice-number"
          label="Invoice number"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          variant="light"
          placeholder="e.g. INV-001"
        />
        <Dropdown
          id="invoice-status"
          name="invoice-status"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value ?? 'draft')}
          options={STATUS_OPTIONS}
          placeholder="Draft"
          searchable={false}
        />
        <CurrencyInput
          id="amount"
          label={`Amount (${defaultCurrency})`}
          value={amount}
          onChange={(e) => setAmount(e.target.value ?? '')}
          currency={defaultCurrency}
          variant="light"
          placeholder="0.00"
        />
        <CurrencyInput
          id="tax"
          label={`Tax (${defaultCurrency})`}
          value={tax}
          onChange={(e) => setTax(e.target.value ?? '')}
          currency={defaultCurrency}
          variant="light"
          placeholder="0.00"
        />
        <CurrencyInput
          id="total"
          label={`Total (${defaultCurrency})`}
          value={computedTotal}
          onChange={() => {}}
          currency={defaultCurrency}
          variant="light"
          placeholder="0.00"
          disabled
        />
        <DateField id="date-issued" label="Date issued" value={dateIssued} onChange={(e) => setDateIssued(e.target.value)} variant="light" />
        <DateField id="due-date" label="Due date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} variant="light" />
        <DateField id="paid-date" label="Paid date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} variant="light" />
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

      <FileUploadList
        id="invoice-file"
        label="Invoices (PDF)"
        value={fileUrls}
        onChange={setFileUrls}
        onUpload={uploadFile}
        accept=".pdf,application/pdf"
        multiple={true}
        placeholder="Drag PDF here or click to upload"
      />

      <TextareaField
        id="notes"
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Include any notes here"
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : invoiceId ? 'Update invoice' : 'Add invoice'}
        </PrimaryButton>
      </div>
    </form>
  );
}
