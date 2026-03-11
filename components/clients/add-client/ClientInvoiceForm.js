import { useState, useCallback, useEffect, useMemo } from 'react';
import InputField from '@/components/ui/InputField';
import DateField from '@/components/ui/DateField';
import Dropdown from '@/components/ui/Dropdown';
import FileUploadList from '@/components/ui/FileUploadList';
import TextareaField from '@/components/ui/TextareaField';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { ItemizedLineItems, DocumentFormHeader, FormStepNav, FormStepFooter, FormStepContent, FormStepSection } from '@/components/ui';
import { unformatCurrency } from '@/utils/formatCurrency';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import { getOrgServices, updateOrgServices, getUserAccount, updateServices } from '@/services/userService';
// Invoice fields aligned with API and Supabase: see lib/invoiceSchema.js

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

const PAYMENT_TERMS_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'due_on_receipt', label: 'Due on receipt' },
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
  industry = null,
  clientEmail: clientEmailProp = '',
  onSuccess,
  onCancel,
}) {
  const projectTermPlural = getTermForIndustry(industry, 'project');
  const projectTermSingular = getTermSingular(projectTermPlural) || 'project';
  const projectTermSingularLower = projectTermSingular.toLowerCase();
  const linkedProjectLabel = `Linked ${projectTermSingularLower}`;
  const clientTermPlural = getTermForIndustry(industry, 'client');
  const clientTermSingular = getTermSingular(clientTermPlural) || 'Client';
  const clientTermSingularLower = clientTermSingular.toLowerCase();
  const serviceTermSingular = getTermSingular(getTermForIndustry(industry, 'services')) || 'Service';
  const proposalTermPlural = getTermForIndustry(industry, 'proposal');
  const proposalTermSingular = getTermSingular(proposalTermPlural) || 'Proposal';
  const proposalTermSingularLower = proposalTermSingular.toLowerCase();
  const invoiceTermPlural = getTermForIndustry(industry, 'invoice');
  const invoiceTermSingular = getTermSingular(invoiceTermPlural) || 'Invoice';
  const invoiceTermSingularLower = invoiceTermSingular.toLowerCase();
  const selectClientPlaceholder = `Select ${clientTermSingularLower}`;
  const unnamedClientLabel = `Unnamed ${clientTermSingularLower}`;
  const untitledProposalLabel = `Untitled ${proposalTermSingularLower}`;
  const contractTermPlural = getTermForIndustry(industry, 'contract');
  const contractTermSingular = getTermSingular(contractTermPlural) || 'Contract';
  const contractTermSingularLower = contractTermSingular.toLowerCase();
  const untitledContractLabel = `Untitled ${contractTermSingularLower}`;

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
  const [discount, setDiscount] = useState(
    initial.discount != null && String(initial.discount).trim() !== '' ? unformatCurrency(String(initial.discount)) : ''
  );
  const [discountType, setDiscountType] = useState('amount');
  const [dateIssued, setDateIssued] = useState(
    toDateLocal(initial.date_issued) || toDateLocal(new Date().toISOString())
  );
  const [dueDate, setDueDate] = useState(toDateLocal(initial.due_date) || '');
  const [dateSent, setDateSent] = useState(toDateLocal(initial.date_sent) || '');
  const [paidDate, setPaidDate] = useState(toDateLocal(initial.paid_date) || '');
  const [paymentTerms, setPaymentTerms] = useState(initial.payment_terms ?? 'due_on_receipt');
  const [paymentMethod, setPaymentMethod] = useState(initial.payment_method ?? '');
  const [fileUrls, setFileUrls] = useState(
    Array.isArray(initial.file_urls) && initial.file_urls.length > 0
      ? initial.file_urls
      : initial.file_url
        ? [initial.file_url]
        : []
  );
  const [startFromProposalId, setStartFromProposalId] = useState(initial.related_proposal_id ?? '');
  const [linkedProposalId, setLinkedProposalId] = useState(initial.related_proposal_id ?? '');
  const [linkedProject, setLinkedProject] = useState(initial.related_project ?? '');
  const [linkedContractId, setLinkedContractId] = useState(initial.linked_contract_id ?? '');
  const [terms, setTerms] = useState(initial.terms ?? '');
  const [scopeSummary, setScopeSummary] = useState(initial.scope_summary ?? '');
  const [lineItems, setLineItems] = useState(() => normalizeLineItems(initial.line_items));
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [hasBeenSentThisSession, setHasBeenSentThisSession] = useState(false);

  const everSent = Boolean(initial.ever_sent) || hasBeenSentThisSession;
  const secondarySubmitLabel = !everSent
    ? `Send ${invoiceTermSingular}`
    : hasUserEdited
      ? 'Save and Resend'
      : 'Resend';

  const markDirty = useCallback(() => setHasUserEdited(true), []);

  const STEPS = [
    { id: 1, label: 'Details', description: 'Dates & amounts' },
    { id: 2, label: 'Line items', description: 'What you\'re charging' },
    { id: 3, label: 'Attachments', description: 'Attachments' },
  ];

  const clientId = showClientDropdown ? selectedClientId : clientIdProp;
  const effectiveClientId = (clientId && String(clientId).trim()) || null;

  const selectedClient = useMemo(
    () => (effectiveClientId ? clients.find((c) => c.id === effectiveClientId) : null),
    [clients, effectiveClientId]
  );
  const clientEmailDisplay = useMemo(() => {
    if (showClientDropdown && selectedClient) {
      const primary = selectedClient.email;
      if (primary && String(primary).trim()) return String(primary).trim();
      const emails = Array.isArray(selectedClient.emails) ? selectedClient.emails : [];
      const first = emails[0];
      if (first && typeof first === 'string') return first.trim();
      if (first && first.address) return String(first.address).trim();
      return '';
    }
    return (clientEmailProp && String(clientEmailProp).trim()) || '';
  }, [selectedClient, showClientDropdown, clientEmailProp]);

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
    { value: '', label: selectClientPlaceholder },
    ...clients.map((c) => ({
      value: c.id,
      label: (c.name || c.companyName || unnamedClientLabel).trim(),
    })),
  ];

  // Load proposals: all on Invoices page; filtered by client when inside a client section
  useEffect(() => {
    if (!userId) return;
    if (clientIdProp) {
      // Client section (e.g. clients/[id]/invoices/new): load this client's proposals only
      setProposalsLoading(true);
      fetch('/api/get-client-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, clientId: clientIdProp, organizationId: organizationId || undefined }),
      })
        .then((res) => res.json())
        .then((data) => setProposals(data.proposals || []))
        .catch(() => setProposals([]))
        .finally(() => setProposalsLoading(false));
    } else if (showClientDropdown) {
      // Invoices page (e.g. invoices/new): load all proposals, no filter by client
      setProposalsLoading(true);
      fetch('/api/get-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId: organizationId || undefined }),
      })
        .then((res) => res.json())
        .then((data) => setProposals(data.proposals || []))
        .catch(() => setProposals([]))
        .finally(() => setProposalsLoading(false));
    } else {
      setProposals([]);
    }
  }, [clientIdProp, userId, organizationId, showClientDropdown]);

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
  }, [userId, organizationId, effectiveClientId]);

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
      label: (p.proposal_number || untitledProposalLabel).trim() || untitledProposalLabel,
    })),
  ];

  const startFromProposalOptions = [
    { value: '', label: `Fill ${invoiceTermSingularLower} manually` },
    ...proposals.map((p) => ({
      value: p.id,
      label: (p.proposal_number || untitledProposalLabel).trim() || untitledProposalLabel,
    })),
  ];

  const handleStartFromProposalChange = useCallback(
    (proposalId) => {
      setStartFromProposalId(proposalId ?? '');
      if (!proposalId) {
        setLineItems([defaultLineItem()]);
        setLinkedProposalId('');
        setFileUrls([]);
        setTerms('');
        setScopeSummary('');
        return;
      }
      const proposal = proposals.find((p) => p.id === proposalId);
      if (proposal) {
        setLineItems(normalizeLineItems(proposal.line_items ?? []));
        setInvoiceTitle(proposal.proposal_title ?? '');
        setLinkedProposalId(proposalId);
        if (proposal.linked_project) setLinkedProject(proposal.linked_project);
        if (showClientDropdown && proposal.client_id) setSelectedClientId(proposal.client_id);
        setScopeSummary(String(proposal.scope_summary ?? '').trim());
        setTerms(String(proposal.terms ?? '').trim());
        if (proposal.tax != null && String(proposal.tax).trim() !== '') setTax(String(proposal.tax).trim());
        if (proposal.discount != null && String(proposal.discount).trim() !== '') setDiscount(String(proposal.discount).trim());
        // Prepopulate invoice files from proposal attachments (Step 3)
        const urls = Array.isArray(proposal.file_urls) && proposal.file_urls.length > 0
          ? proposal.file_urls.filter((u) => u && String(u).trim())
          : proposal.file_url
            ? [String(proposal.file_url).trim()].filter(Boolean)
            : [];
        setFileUrls(urls);
      }
    },
    [proposals, showClientDropdown]
  );
  const contractOptions = [
    { value: '', label: 'None' },
    ...contracts.map((c) => ({
      value: c.id,
      label: (c.contract_number || untitledContractLabel).trim() || untitledContractLabel,
    })),
  ];

  const projectOptions = [
    { value: '', label: 'No project' },
    ...projects.map((p) => ({
      value: p.id,
      label: (p.project_number || p.id || 'Untitled project').trim() || 'Untitled project',
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
  const discountPctRaw = parseFloat(String(discount).replace(/[^\d.-]/g, '')) || 0;
  const discountPctClamped = discountType === 'percent' ? Math.min(100, Math.max(0, discountPctRaw)) : 0;
  const discountAmount =
    discountType === 'percent'
      ? lineItemsSubtotal * (discountPctClamped / 100)
      : parseFloat(unformatCurrency(discount)) || 0;

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
    ? (lineItemsSubtotal + taxNum - discountAmount).toFixed(2)
    : ((parseFloat(unformatCurrency(amount)) || 0) + taxNum - discountAmount).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!invoiceTitle.trim()) {
      setError(`${invoiceTermSingular} title is required`);
      return;
    }
    setSaving(true);
    try {
      const amountFromItems = lineItems.length > 0 ? String(lineItemsSubtotal.toFixed(2)) : amount.trim();
      const totalFromItems = lineItems.length > 0 ? computedTotal : computedTotal;
      const pct = discountType === 'percent'
        ? Math.min(100, Math.max(0, parseFloat(String(discount).replace(/[^\d.-]/g, '')) || 0)) / 100
        : 0;
      const baseForPct = lineItems.length > 0 ? lineItemsSubtotal : (parseFloat(unformatCurrency(amount)) || 0);
      const discountPayload =
        discountType === 'percent' ? String((baseForPct * pct).toFixed(2)) : discount.trim();
      const payload = {
        userId,
        clientId: effectiveClientId,
        organizationId: organizationId || undefined,
        invoice_number: invoiceNumber.trim(),
        invoice_title: invoiceTitle.trim(),
        amount: amountFromItems || amount.trim(),
        tax: tax.trim(),
        discount: discountPayload,
        total: totalFromItems,
        date_issued: dateIssued.trim() || null,
        due_date: dueDate.trim() || null,
        date_sent: dateSent.trim() || null,
        paid_date: paidDate.trim() || null,
        ever_sent: invoiceId ? (initial.ever_sent ?? false) : false,
        status,
        payment_terms: paymentTerms.trim() || null,
        payment_method: paymentMethod.trim(),
        file_urls: fileUrls.filter(Boolean).map((u) => String(u).trim()).filter(Boolean),
        related_proposal_id: linkedProposalId.trim() || null,
        related_project: linkedProject.trim() || null,
        linked_contract_id: linkedContractId.trim() || null,
        terms: terms.trim() || null,
        scope_summary: scopeSummary.trim() || null,
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
        if (!res.ok) throw new Error(data.error || `Failed to update ${invoiceTermSingularLower}`);
      } else {
        const res = await fetch('/api/create-client-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed to create ${invoiceTermSingularLower}`);
      }
      setHasUserEdited(false);
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
    if (!invoiceTitle.trim()) {
      setError(`${invoiceTermSingular} title is required`);
      return;
    }
    setSaving(true);
    const dateSentToday = new Date().toISOString().slice(0, 10);
    try {
      const amountFromItems = lineItems.length > 0 ? String(lineItemsSubtotal.toFixed(2)) : amount.trim();
      const totalFromItems = lineItems.length > 0 ? computedTotal : computedTotal;
      const pct = discountType === 'percent'
        ? Math.min(100, Math.max(0, parseFloat(String(discount).replace(/[^\d.-]/g, '')) || 0)) / 100
        : 0;
      const baseForPct = lineItems.length > 0 ? lineItemsSubtotal : (parseFloat(unformatCurrency(amount)) || 0);
      const discountPayload =
        discountType === 'percent' ? String((baseForPct * pct).toFixed(2)) : discount.trim();
      const payload = {
        userId,
        clientId: effectiveClientId,
        organizationId: organizationId || undefined,
        invoice_number: invoiceNumber.trim(),
        invoice_title: invoiceTitle.trim(),
        amount: amountFromItems || amount.trim(),
        tax: tax.trim(),
        discount: discountPayload,
        total: totalFromItems,
        date_issued: dateIssued.trim() || null,
        due_date: dueDate.trim() || null,
        date_sent: dateSentToday,
        paid_date: paidDate.trim() || null,
        ever_sent: true,
        status,
        payment_terms: paymentTerms.trim() || null,
        payment_method: paymentMethod.trim(),
        file_urls: fileUrls.filter(Boolean).map((u) => String(u).trim()).filter(Boolean),
        related_proposal_id: linkedProposalId.trim() || null,
        related_project: linkedProject.trim() || null,
        linked_contract_id: linkedContractId.trim() || null,
        terms: terms.trim() || null,
        scope_summary: scopeSummary.trim() || null,
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
        if (!res.ok) throw new Error(data.error || `Failed to update ${invoiceTermSingularLower}`);
      } else {
        const res = await fetch('/api/create-client-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed to create ${invoiceTermSingularLower}`);
      }
      setDateSent(dateSentToday);
      setHasBeenSentThisSession(true);
      setHasUserEdited(false);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to save and send invoice');
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
        sectionLabel={invoiceTermSingular}
        idPrefix="invoice"
        titleLabel={`${invoiceTermSingular} title`}
        titleValue={invoiceTitle}
        titlePlaceholder="Description or reason"
        titleRequired={true}
        onTitleChange={(e) => { markDirty(); setInvoiceTitle(e.target.value); }}
        documentIdLabel={`${invoiceTermSingular} ID`}
        documentIdValue={invoiceNumber}
        documentIdPlaceholder="Auto-generated or enter your own"
        onDocumentIdChange={(e) => { markDirty(); setInvoiceNumber(e.target.value); }}
        statusLabel="Status"
        statusValue={status}
        statusOptions={STATUS_OPTIONS}
        onStatusChange={(e) => { markDirty(); setStatus(e.target.value ?? 'draft'); }}
        statusPlaceholder="Draft"
        showClientDropdown={showClientDropdown}
        clientLabel={clientTermSingular}
        clientPlaceholder={selectClientPlaceholder}
        selectedClientId={selectedClientId}
        onClientChange={(e) => { markDirty(); setSelectedClientId(e.target.value ?? ''); }}
        clientOptions={clientOptions}
        clientsLoading={clientsLoading}
        showUseProposalDropdown={true}
        useProposalLabel={`Use ${proposalTermSingular}`}
        useProposalValue={startFromProposalId}
        onUseProposalChange={(e) => { markDirty(); handleStartFromProposalChange(e.target.value ?? ''); }}
        useProposalOptions={startFromProposalOptions}
        useProposalLoading={proposalsLoading}
        useProposalPlaceholder={effectiveClientId ? `Fill ${invoiceTermSingularLower} manually` : `Select a ${proposalTermSingularLower}`}
        showClientEmail={showClientDropdown || !!clientIdProp}
        clientEmailValue={clientEmailDisplay}
        clientEmailDisabled={showClientDropdown ? !effectiveClientId : true}
        clientEmailPlaceholder={
          showClientDropdown
            ? (effectiveClientId ? 'No email in client profile' : `Select a ${clientTermSingularLower} above`)
            : 'No email in client profile'
        }
        clientEmailLabel={`${clientTermSingular} email`}
        clientEmailHint={
          showClientDropdown
            ? (effectiveClientId
              ? 'Invoices are sent to this address when you click Send or Resend.'
              : `Choose a ${clientTermSingularLower} to see their email from the profile.`)
            : 'Invoices are sent to this address when you click Send or Resend.'
        }
      />

      <FormStepNav
        steps={STEPS}
        currentStep={step}
        onStepChange={setStep}
        ariaLabel={`${invoiceTermSingular} form steps`}
      />

      <FormStepContent>
        {step === 1 && (
          <FormStepSection title="Details" description="Dates, payment & links">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DateField id="date-issued" label="Date issued" value={dateIssued} onChange={(e) => { markDirty(); setDateIssued(e.target.value); }} variant="light" />
              <DateField id="due-date" label="Due date" value={dueDate} onChange={(e) => { markDirty(); setDueDate(e.target.value); }} variant="light" />
              <DateField id="date-sent" label="Date sent" value={dateSent} onChange={(e) => { markDirty(); setDateSent(e.target.value); }} variant="light" />
              <DateField id="date-paid" label="Date paid" value={paidDate} onChange={(e) => { markDirty(); setPaidDate(e.target.value); }} variant="light" />
              {lineItems.length === 0 && (
                <CurrencyInput
                  id="amount"
                  label={`Amount (${defaultCurrency})`}
                  value={amount}
                  onChange={(e) => { markDirty(); setAmount(e.target.value ?? ''); }}
                  currency={defaultCurrency}
                  variant="light"
                  placeholder="0.00"
                />
              )}
              <Dropdown
                id="payment-terms"
                name="payment-terms"
                label="Payment terms"
                value={paymentTerms}
                onChange={(e) => { markDirty(); setPaymentTerms(e.target.value ?? ''); }}
                options={PAYMENT_TERMS_OPTIONS}
                placeholder="Select payment terms"
                searchable={false}
              />
              <Dropdown
                id="payment-method"
                name="payment-method"
                label="Payment method"
                value={paymentMethod}
                onChange={(e) => { markDirty(); setPaymentMethod(e.target.value ?? ''); }}
                options={PAYMENT_METHOD_OPTIONS}
                placeholder="None"
                searchable={false}
              />
              <Dropdown
                id="linked-project"
                name="linked-project"
                label={linkedProjectLabel}
                value={linkedProject}
                onChange={(e) => { markDirty(); setLinkedProject(e.target.value ?? ''); }}
                options={projectOptions}
                placeholder={projectsLoading ? 'Loading…' : projectOptions.length > 10 ? `Select ${projectTermSingularLower}` : `No ${projectTermSingularLower}`}
                searchable={projectOptions.length > 10}
              />
              <Dropdown
                id="linked-contract"
                name="linked-contract"
                label={`Linked ${contractTermSingularLower}`}
                value={linkedContractId}
                onChange={(e) => { markDirty(); setLinkedContractId(e.target.value ?? ''); }}
                options={contractOptions}
                placeholder={contractsLoading ? 'Loading…' : contractOptions.length > 10 ? `Select ${contractTermSingularLower}` : 'None'}
                searchable={contractOptions.length > 10}
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <TextareaField
                  id="scope-summary"
                  label="Scope"
                  value={scopeSummary}
                  onChange={(e) => { markDirty(); setScopeSummary(e.target.value); }}
                  rows={3}
                  placeholder={`Scope of work (prepopulated from linked ${proposalTermSingularLower})`}
                  variant="light"
                />
              </div>
            </div>
          </FormStepSection>
        )}

        {step === 2 && (
          <FormStepSection title="Line items" description="Itemize what you're charging for">
            <div className="relative min-h-[280px]">
              {(status === 'paid' || status === 'partially_paid') && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                  aria-hidden
                >
                  <span
                    className="text-7xl sm:text-8xl md:text-9xl font-black tracking-widest text-red-500/35 dark:text-red-400/30 select-none"
                    style={{
                      transform: 'rotate(-18deg)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    PAID
                  </span>
                </div>
              )}
            <ItemizedLineItems
              items={lineItems}
              onChange={(items) => { markDirty(); setLineItems(items); }}
              currency={defaultCurrency}
              itemLabel={serviceTermSingular}
              addLabel="Add item"
              services={services}
              onServiceCreated={saveServices}
              teamMembers={teamMembers}
              industry={industry}
              tax={tax}
              discount={discount}
              onTaxChange={(v) => { markDirty(); setTax(v); }}
              onDiscountChange={(v) => { markDirty(); setDiscount(v); }}
              discountType={discountType}
              onDiscountTypeChange={(v) => { markDirty(); setDiscountType(v); }}
            />
            {lineItems.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Leave empty to use the single Amount from Step 1. Add items to build a line-item total (subtotal + tax − discount = total).
              </p>
            )}
            </div>
          </FormStepSection>
        )}

        {step === 3 && (
          <FormStepSection>
            <TextareaField
              id="terms"
              label="Terms"
              value={terms}
              onChange={(e) => { markDirty(); setTerms(e.target.value); }}
              rows={6}
              placeholder={`Terms and conditions (prepopulated from linked ${proposalTermSingularLower})`}
              variant="light"
            />
            <FileUploadList
              id="invoice-file"
              label={`${invoiceTermSingular} files (PDF)`}
              value={fileUrls}
              onChange={(v) => { markDirty(); setFileUrls(v); }}
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
        submitLabel={invoiceId ? `Update ${invoiceTermSingularLower}` : `Add ${invoiceTermSingularLower}`}
        onSubmitClick={() => handleSubmit({ preventDefault: () => {} })}
        saving={saving}
        submitDisabled={(showClientDropdown && !effectiveClientId) || !invoiceTitle.trim()}
        hasChanges={hasUserEdited}
        secondarySubmitLabel={secondarySubmitLabel}
        onSecondarySubmitClick={handleSaveAndSend}
      />
    </form>
  );
}
