import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { HiPlus, HiDocumentText, HiInbox, HiCurrencyDollar, HiPaperClip, HiGlobe } from 'react-icons/hi';
import { PrimaryButton } from '@/components/ui/buttons';
import { ConfirmationDialog } from '@/components/ui';
import CardDeleteButton from './CardDeleteButton';
import EmptyStateCard from './EmptyStateCard';
import SideNavViewerLayout from './SideNavViewerLayout';
import ContractLogCards from './ContractLogCards';
import ProposalLogCards from './ProposalLogCards';
import InvoiceLogCards from './InvoiceLogCards';
import AttachmentLogCards from './AttachmentLogCards';
import OnlineResourceLogCards from './OnlineResourceLogCards';

export const DOC_TYPES = [
  {
    key: 'contracts',
    label: 'Contracts',
    description: 'Contracts with title, status, dates, and file links',
    icon: HiDocumentText,
    borderClass: 'border-l-primary-500 dark:border-l-primary-400',
    badgeClass: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
  },
  {
    key: 'proposals',
    label: 'Proposals',
    description: 'Proposals or quotes sent to this client',
    icon: HiInbox,
    borderClass: 'border-l-emerald-500 dark:border-l-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  {
    key: 'invoices',
    label: 'Invoices',
    description: 'Invoice references or payment records',
    icon: HiCurrencyDollar,
    borderClass: 'border-l-violet-500 dark:border-l-violet-400',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  },
  {
    key: 'attachments',
    label: 'Attachments',
    description: 'Other files or documents linked to this client',
    icon: HiPaperClip,
    borderClass: 'border-l-amber-500 dark:border-l-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
  {
    key: 'onlineResources',
    label: 'Online Resources',
    description: 'Links, portals, and web references for this client',
    icon: HiGlobe,
    borderClass: 'border-l-cyan-500 dark:border-l-cyan-400',
    badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  },
];

const VALID_DOC_SECTION_KEYS = DOC_TYPES.map((t) => t.key);

function ContractsBlock({ clientId, userId, organizationId, onHasEntries }) {
  const router = useRouter();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(!!clientId && !!userId);
  const [contractToDelete, setContractToDelete] = useState(null);

  useEffect(() => {
    if (!clientId || !userId) return;
    setLoading(true);
    fetch('/api/get-client-contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setContracts(data.contracts || []))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [clientId, userId, organizationId]);

  useEffect(() => {
    if (onHasEntries && !loading) onHasEntries(contracts.length > 0);
  }, [contracts.length, loading, onHasEntries]);

  const type = DOC_TYPES[0];
  const newUrl = `/dashboard/clients/${clientId}/contracts/new`;
  const editUrl = (id) => `/dashboard/clients/${clientId}/contracts/${id}/edit`;

  const handleDeleteConfirm = async () => {
    if (!contractToDelete) return;
    try {
      const res = await fetch('/api/delete-client-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          contractId: contractToDelete,
          organizationId: organizationId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setContracts((prev) => prev.filter((c) => c.id !== contractToDelete));
      setContractToDelete(null);
    } catch (err) {
      console.error(err);
      setContractToDelete(null);
    }
  };

  if (loading) {
    return <EmptyStateCard message="Loading contracts…" />;
  }

  if (contracts.length === 0) {
    return (
      <EmptyStateCard
        message="No contracts yet"
        action={
          <PrimaryButton type="button" onClick={() => router.push(newUrl)} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add contract
          </PrimaryButton>
        }
      />
    );
  }

  return (
    <>
      <ContractLogCards
        contracts={contracts}
        onSelect={(id) => router.push(editUrl(id))}
        onDelete={setContractToDelete}
        borderClass={type.borderClass}
      />
      <ConfirmationDialog
        isOpen={!!contractToDelete}
        onClose={() => setContractToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete contract"
        message="This contract will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}

function ProposalsBlock({ clientId, userId, organizationId, onHasEntries }) {
  const router = useRouter();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(!!clientId && !!userId);
  const [proposalToDelete, setProposalToDelete] = useState(null);

  useEffect(() => {
    if (!clientId || !userId) return;
    setLoading(true);
    fetch('/api/get-client-proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setProposals(data.proposals || []))
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  }, [clientId, userId, organizationId]);

  useEffect(() => {
    if (onHasEntries && !loading) onHasEntries(proposals.length > 0);
  }, [proposals.length, loading, onHasEntries]);

  const type = DOC_TYPES[1];
  const newUrl = `/dashboard/clients/${clientId}/proposals/new`;
  const editUrl = (id) => `/dashboard/clients/${clientId}/proposals/${id}/edit`;

  const handleDeleteConfirm = async () => {
    if (!proposalToDelete) return;
    try {
      const res = await fetch('/api/delete-client-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          proposalId: proposalToDelete,
          organizationId: organizationId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setProposals((prev) => prev.filter((p) => p.id !== proposalToDelete));
      setProposalToDelete(null);
    } catch (err) {
      console.error(err);
      setProposalToDelete(null);
    }
  };

  if (loading) {
    return <EmptyStateCard message="Loading proposals…" />;
  }

  if (proposals.length === 0) {
    return (
      <EmptyStateCard
        message="No proposals yet"
        action={
          <PrimaryButton type="button" onClick={() => router.push(newUrl)} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add proposal
          </PrimaryButton>
        }
      />
    );
  }

  return (
    <>
      <ProposalLogCards
        proposals={proposals}
        onSelect={(id) => router.push(editUrl(id))}
        onDelete={setProposalToDelete}
        borderClass={type.borderClass}
      />
      <ConfirmationDialog
        isOpen={!!proposalToDelete}
        onClose={() => setProposalToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete proposal"
        message="This proposal will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}

function InvoicesBlock({ clientId, userId, organizationId, onHasEntries }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(!!clientId && !!userId);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  useEffect(() => {
    if (!clientId || !userId) return;
    setLoading(true);
    fetch('/api/get-client-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setInvoices(data.invoices || []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [clientId, userId, organizationId]);

  useEffect(() => {
    if (onHasEntries && !loading) onHasEntries(invoices.length > 0);
  }, [invoices.length, loading, onHasEntries]);

  const type = DOC_TYPES[2];
  const newUrl = `/dashboard/clients/${clientId}/invoices/new`;
  const editUrl = (id) => `/dashboard/clients/${clientId}/invoices/${id}/edit`;

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    try {
      const res = await fetch('/api/delete-client-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          invoiceId: invoiceToDelete,
          organizationId: organizationId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setInvoices((prev) => prev.filter((i) => i.id !== invoiceToDelete));
      setInvoiceToDelete(null);
    } catch (err) {
      console.error(err);
      setInvoiceToDelete(null);
    }
  };

  if (loading) {
    return <EmptyStateCard message="Loading invoices…" />;
  }

  if (invoices.length === 0) {
    return (
      <EmptyStateCard
        message="No invoices yet"
        action={
          <PrimaryButton type="button" onClick={() => router.push(newUrl)} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add invoice
          </PrimaryButton>
        }
      />
    );
  }

  return (
    <>
      <InvoiceLogCards
        invoices={invoices}
        onSelect={(id) => router.push(editUrl(id))}
        onDelete={setInvoiceToDelete}
        borderClass={type.borderClass}
      />
      <ConfirmationDialog
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete invoice"
        message="This invoice will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}

function AttachmentsBlock({ clientId, userId, organizationId, onHasEntries }) {
  const router = useRouter();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(!!clientId && !!userId);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);

  useEffect(() => {
    if (!clientId || !userId) return;
    setLoading(true);
    fetch('/api/get-client-attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setAttachments(data.attachments || []))
      .catch(() => setAttachments([]))
      .finally(() => setLoading(false));
  }, [clientId, userId, organizationId]);

  useEffect(() => {
    if (onHasEntries && !loading) onHasEntries(attachments.length > 0);
  }, [attachments.length, loading, onHasEntries]);

  const type = DOC_TYPES[3];
  const newUrl = `/dashboard/clients/${clientId}/attachments/new`;
  const editUrl = (id) => `/dashboard/clients/${clientId}/attachments/${id}/edit`;

  const handleDeleteConfirm = async () => {
    if (!attachmentToDelete) return;
    try {
      const res = await fetch('/api/delete-client-attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          attachmentId: attachmentToDelete,
          organizationId: organizationId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentToDelete));
      setAttachmentToDelete(null);
    } catch (err) {
      console.error(err);
      setAttachmentToDelete(null);
    }
  };

  if (loading) {
    return <EmptyStateCard message="Loading attachments…" />;
  }

  if (attachments.length === 0) {
    return (
      <EmptyStateCard
        message="No attachments yet"
        action={
          <PrimaryButton type="button" onClick={() => router.push(newUrl)} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add attachment
          </PrimaryButton>
        }
      />
    );
  }

  return (
    <>
      <AttachmentLogCards
        attachments={attachments}
        onSelect={(id) => router.push(editUrl(id))}
        onDelete={setAttachmentToDelete}
        borderClass={type.borderClass}
      />
      <ConfirmationDialog
        isOpen={!!attachmentToDelete}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete attachment"
        message="This attachment will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}

function OnlineResourcesBlock({ clientId, userId, organizationId, onHasEntries }) {
  const router = useRouter();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(!!clientId && !!userId);
  const [resourceToDelete, setResourceToDelete] = useState(null);

  useEffect(() => {
    if (!clientId || !userId) return;
    setLoading(true);
    fetch('/api/get-client-online-resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setResources(data.resources || []))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [clientId, userId, organizationId]);

  useEffect(() => {
    if (onHasEntries && !loading) onHasEntries(resources.length > 0);
  }, [resources.length, loading, onHasEntries]);

  const type = DOC_TYPES[4];
  const newUrl = `/dashboard/clients/${clientId}/online-resources/new`;
  const editUrl = (id) => `/dashboard/clients/${clientId}/online-resources/${id}/edit`;

  const handleDeleteConfirm = async () => {
    if (!resourceToDelete) return;
    try {
      const res = await fetch('/api/delete-client-online-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          resourceId: resourceToDelete,
          organizationId: organizationId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setResources((prev) => prev.filter((r) => r.id !== resourceToDelete));
      setResourceToDelete(null);
    } catch (err) {
      console.error(err);
      setResourceToDelete(null);
    }
  };

  if (loading) {
    return <EmptyStateCard message="Loading online resources…" />;
  }

  if (resources.length === 0) {
    return (
      <EmptyStateCard
        message="No online resources yet"
        action={
          <PrimaryButton type="button" onClick={() => router.push(newUrl)} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add resource
          </PrimaryButton>
        }
      />
    );
  }

  return (
    <>
      <OnlineResourceLogCards
        resources={resources}
        onSelect={(id) => router.push(editUrl(id))}
        onDelete={setResourceToDelete}
        borderClass={type.borderClass}
      />
      <ConfirmationDialog
        isOpen={!!resourceToDelete}
        onClose={() => setResourceToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete online resource"
        message="This resource will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}

function DocumentBlock({ type, items, onAdd, onEdit, onRemove }) {
  if (items.length === 0) {
    return (
      <EmptyStateCard
        message="No entries yet"
        action={
          <PrimaryButton type="button" onClick={onAdd} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add
          </PrimaryButton>
        }
      />
    );
  }
  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`group relative rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${type.borderClass} pl-4 pr-11 py-2.5 min-h-[44px] flex items-center`}
        >
          <input
            type="text"
            id={`${type.key}-${idx}`}
            value={item}
            onChange={(e) => onEdit(idx, e.target.value)}
            placeholder="Name, reference, or link..."
            className="w-full text-sm bg-transparent border-0 py-0 px-0 focus:ring-0 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
            aria-label={`${type.label} entry ${idx + 1}`}
          />
          <CardDeleteButton
            onDelete={() => onRemove(idx)}
            title="Remove entry"
            className="absolute top-1/2 right-3 -translate-y-1/2 opacity-0 group-hover:opacity-100"
          />
        </div>
      ))}
    </div>
  );
}

export default function DocumentsFilesSection({
  clientId,
  userId,
  organizationId,
  contracts,
  proposals,
  invoices,
  attachments,
  onlineResources,
  onContractsChange,
  onProposalsChange,
  onInvoicesChange,
  onAttachmentsChange,
  onOnlineResourcesChange,
  initialSection,
}) {
  const router = useRouter();
  const useContractsFromApi = Boolean(clientId && userId);
  const useProposalsFromApi = Boolean(clientId && userId);
  const useInvoicesFromApi = Boolean(clientId && userId);
  const useAttachmentsFromApi = Boolean(clientId && userId);
  const useOnlineResourcesFromApi = Boolean(clientId && userId);
  const defaultKey = initialSection && VALID_DOC_SECTION_KEYS.includes(initialSection) ? initialSection : DOC_TYPES[0].key;
  const [selectedKey, setSelectedKey] = useState(defaultKey);
  const [hasContractEntries, setHasContractEntries] = useState(false);
  const [hasProposalEntries, setHasProposalEntries] = useState(false);
  const [hasInvoiceEntries, setHasInvoiceEntries] = useState(false);
  const [hasAttachmentEntries, setHasAttachmentEntries] = useState(false);
  const [hasOnlineResourceEntries, setHasOnlineResourceEntries] = useState(false);

  useEffect(() => {
    if (initialSection && VALID_DOC_SECTION_KEYS.includes(initialSection)) {
      setSelectedKey(initialSection);
    }
  }, [initialSection]);

  const blocks = [
    {
      type: DOC_TYPES[0],
      items: contracts,
      onAdd: () => onContractsChange([...contracts, '']),
      onEdit: (idx, v) => {
        const u = [...contracts];
        u[idx] = v;
        onContractsChange(u);
      },
      onRemove: (idx) => onContractsChange(contracts.filter((_, i) => i !== idx)),
    },
    {
      type: DOC_TYPES[1],
      items: proposals,
      onAdd: () => onProposalsChange([...proposals, '']),
      onEdit: (idx, v) => {
        const u = [...proposals];
        u[idx] = v;
        onProposalsChange(u);
      },
      onRemove: (idx) => onProposalsChange(proposals.filter((_, i) => i !== idx)),
    },
    {
      type: DOC_TYPES[2],
      items: invoices,
      onAdd: () => onInvoicesChange([...invoices, '']),
      onEdit: (idx, v) => {
        const u = [...invoices];
        u[idx] = v;
        onInvoicesChange(u);
      },
      onRemove: (idx) => onInvoicesChange(invoices.filter((_, i) => i !== idx)),
    },
    {
      type: DOC_TYPES[3],
      items: attachments,
      onAdd: () => onAttachmentsChange([...attachments, '']),
      onEdit: (idx, v) => {
        const u = [...attachments];
        u[idx] = v;
        onAttachmentsChange(u);
      },
      onRemove: (idx) => onAttachmentsChange(attachments.filter((_, i) => i !== idx)),
    },
    {
      type: DOC_TYPES[4],
      items: onlineResources,
      onAdd: () => onOnlineResourcesChange([...onlineResources, '']),
      onEdit: (idx, v) => {
        const u = [...onlineResources];
        u[idx] = v;
        onOnlineResourcesChange(u);
      },
      onRemove: (idx) => onOnlineResourcesChange(onlineResources.filter((_, i) => i !== idx)),
    },
  ];

  const selectedType = DOC_TYPES.find((t) => t.key === selectedKey);
  const selectedBlock = blocks.find((b) => b.type.key === selectedKey);
  const hasEntriesInSelectedSection =
    selectedKey === 'contracts' && useContractsFromApi
      ? hasContractEntries
      : selectedKey === 'proposals' && useProposalsFromApi
        ? hasProposalEntries
        : selectedKey === 'invoices' && useInvoicesFromApi
          ? hasInvoiceEntries
          : selectedKey === 'attachments' && useAttachmentsFromApi
            ? hasAttachmentEntries
            : selectedKey === 'onlineResources' && useOnlineResourcesFromApi
              ? hasOnlineResourceEntries
              : (selectedBlock?.items?.length ?? 0) > 0;

  const handleAddInHeader = () => {
    if (selectedKey === 'contracts' && useContractsFromApi) {
      router.push(`/dashboard/clients/${clientId}/contracts/new`);
      return;
    }
    if (selectedKey === 'proposals' && useProposalsFromApi) {
      router.push(`/dashboard/clients/${clientId}/proposals/new`);
      return;
    }
    if (selectedKey === 'invoices' && useInvoicesFromApi) {
      router.push(`/dashboard/clients/${clientId}/invoices/new`);
      return;
    }
    if (selectedKey === 'attachments' && useAttachmentsFromApi) {
      router.push(`/dashboard/clients/${clientId}/attachments/new`);
      return;
    }
    if (selectedKey === 'onlineResources' && useOnlineResourcesFromApi) {
      router.push(`/dashboard/clients/${clientId}/online-resources/new`);
      return;
    }
    if (selectedBlock) selectedBlock.onAdd();
  };

  const navItems = DOC_TYPES.map((t) => ({
    ...t,
    count:
      (t.key === 'contracts' && useContractsFromApi) ||
      (t.key === 'proposals' && useProposalsFromApi) ||
      (t.key === 'invoices' && useInvoicesFromApi) ||
      (t.key === 'attachments' && useAttachmentsFromApi) ||
      (t.key === 'onlineResources' && useOnlineResourcesFromApi)
        ? null
        : (blocks.find((b) => b.type.key === t.key)?.items?.length ?? 0),
  }));

  const viewerHeader = selectedType
    ? {
        icon: selectedType.icon,
        title: selectedType.label,
        description: selectedType.description,
        badgeClass: selectedType.badgeClass,
      }
    : null;

  return (
    <SideNavViewerLayout
      introText="Track contracts, proposals, invoices, and other documents for this client."
      navAriaLabel="Documents sections"
      navItems={navItems}
      selectedKey={selectedKey}
      onSelectKey={setSelectedKey}
      viewerHeader={viewerHeader}
      viewerHeaderAction={
        hasEntriesInSelectedSection ? (
          <PrimaryButton type="button" onClick={handleAddInHeader} className="gap-2 flex-shrink-0">
            <HiPlus className="w-5 h-5" />
            Add
          </PrimaryButton>
        ) : null
      }
    >
      {selectedKey === 'contracts' && useContractsFromApi ? (
        <ContractsBlock
          clientId={clientId}
          userId={userId}
          organizationId={organizationId}
          onHasEntries={setHasContractEntries}
        />
      ) : selectedKey === 'proposals' && useProposalsFromApi ? (
        <ProposalsBlock
          clientId={clientId}
          userId={userId}
          organizationId={organizationId}
          onHasEntries={setHasProposalEntries}
        />
      ) : selectedKey === 'invoices' && useInvoicesFromApi ? (
        <InvoicesBlock
          clientId={clientId}
          userId={userId}
          organizationId={organizationId}
          onHasEntries={setHasInvoiceEntries}
        />
      ) : selectedKey === 'attachments' && useAttachmentsFromApi ? (
        <AttachmentsBlock
          clientId={clientId}
          userId={userId}
          organizationId={organizationId}
          onHasEntries={setHasAttachmentEntries}
        />
      ) : selectedKey === 'onlineResources' && useOnlineResourcesFromApi ? (
        <OnlineResourcesBlock
          clientId={clientId}
          userId={userId}
          organizationId={organizationId}
          onHasEntries={setHasOnlineResourceEntries}
        />
      ) : selectedBlock ? (
        <DocumentBlock {...selectedBlock} />
      ) : null}
    </SideNavViewerLayout>
  );
}
