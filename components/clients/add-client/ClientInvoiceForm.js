import { useState, useCallback } from 'react';
import InputField from '@/components/ui/InputField';
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
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'void', label: 'Void' },
];

export default function ClientInvoiceForm({
  initial = {},
  clientId,
  userId,
  organizationId,
  invoiceId,
  onSuccess,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(initial.invoice_number ?? '');
  const [invoiceTitle, setInvoiceTitle] = useState(initial.invoice_title ?? '');
  const [amount, setAmount] = useState(initial.amount ?? '');
  const [tax, setTax] = useState(initial.tax ?? '');
  const [total, setTotal] = useState(initial.total ?? '');
  const [dateIssued, setDateIssued] = useState(toDateLocal(initial.date_issued) || '');
  const [dueDate, setDueDate] = useState(toDateLocal(initial.due_date) || '');
  const [paidDate, setPaidDate] = useState(toDateLocal(initial.paid_date) || '');
  const [status, setStatus] = useState(initial.status ?? 'draft');
  const [paymentMethod, setPaymentMethod] = useState(initial.payment_method ?? '');
  const [outstandingBalance, setOutstandingBalance] = useState(initial.outstanding_balance ?? '');
  const [fileUrl, setFileUrl] = useState(initial.file_url ?? '');
  const [relatedProposalId, setRelatedProposalId] = useState(initial.related_proposal_id ?? '');
  const [relatedProject, setRelatedProject] = useState(initial.related_project ?? '');
  const [relatedService, setRelatedService] = useState(initial.related_service ?? '');

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
        total: total.trim(),
        date_issued: dateIssued.trim() || null,
        due_date: dueDate.trim() || null,
        paid_date: paidDate.trim() || null,
        status,
        payment_method: paymentMethod.trim(),
        outstanding_balance: outstandingBalance.trim(),
        file_url: fileUrl.trim() || null,
        related_proposal_id: relatedProposalId.trim() || null,
        related_project: relatedProject.trim() || null,
        related_service: relatedService.trim() || null,
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="invoice-number"
          label="Invoice number"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          variant="light"
          placeholder="e.g. INV-001"
        />
        <InputField
          id="invoice-title"
          label="Invoice title / reason"
          value={invoiceTitle}
          onChange={(e) => setInvoiceTitle(e.target.value)}
          variant="light"
          placeholder="Description or reason"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputField
          id="amount"
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          variant="light"
          placeholder="e.g. 1,000.00"
        />
        <InputField
          id="tax"
          label="Tax"
          value={tax}
          onChange={(e) => setTax(e.target.value)}
          variant="light"
          placeholder="e.g. 80.00"
        />
        <InputField
          id="total"
          label="Total"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          variant="light"
          placeholder="e.g. 1,080.00"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DateField id="date-issued" label="Date issued" value={dateIssued} onChange={(e) => setDateIssued(e.target.value)} variant="light" />
        <DateField id="due-date" label="Due date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} variant="light" />
        <DateField id="paid-date" label="Paid date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} variant="light" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <InputField
          id="payment-method"
          label="Payment method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          variant="light"
          placeholder="e.g. Bank transfer, Card"
        />
      </div>

      <InputField
        id="outstanding-balance"
        label="Outstanding balance"
        value={outstandingBalance}
        onChange={(e) => setOutstandingBalance(e.target.value)}
        variant="light"
        placeholder="e.g. 0.00 or remaining amount"
      />

      <FileUploadList
        id="invoice-file"
        label="Invoice PDF"
        value={fileUrl ? [fileUrl] : []}
        onChange={(urls) => setFileUrl(urls.length ? urls[0] : '')}
        onUpload={uploadFile}
        accept=".pdf,application/pdf"
        multiple={false}
        placeholder="Drag PDF here or click to upload"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputField
          id="related-proposal-id"
          label="Related proposal ID"
          value={relatedProposalId}
          onChange={(e) => setRelatedProposalId(e.target.value)}
          variant="light"
          placeholder="Proposal UUID (optional)"
        />
        <InputField
          id="related-project"
          label="Related project"
          value={relatedProject}
          onChange={(e) => setRelatedProject(e.target.value)}
          variant="light"
          placeholder="Project name (optional)"
        />
        <InputField
          id="related-service"
          label="Related service"
          value={relatedService}
          onChange={(e) => setRelatedService(e.target.value)}
          variant="light"
          placeholder="Service (optional)"
        />
      </div>

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
