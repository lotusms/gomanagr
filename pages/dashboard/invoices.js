import Head from 'next/head';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader, ConfirmationDialog } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import InvoicesPageSkeleton from '@/components/dashboard/InvoicesPageSkeleton';
import EmptyStateCard from '@/components/clients/add-client/EmptyStateCard';
import InvoiceCardServiceStyle from '@/components/dashboard/InvoiceCardServiceStyle';
import { HiPlus } from 'react-icons/hi';

function InvoicesContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');

  useEffect(() => {
    if (!currentUser?.uid) return;
    setOrgResolved(false);
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgResolved(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((account) => {
        const currency = account?.clientSettings?.defaultCurrency || 'USD';
        setDefaultCurrency(currency);
      })
      .catch(() => setDefaultCurrency('USD'));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !orgResolved) return;
    setLoading(true);
    const orgId = organization?.id ?? undefined;

    Promise.all([
      fetch('/api/get-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
      }).then((r) => r.json().then((d) => d.invoices || [])),
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      }).then((r) => r.json().then((d) => d.clients || [])),
    ])
      .then(([invoicesList, clientsList]) => {
        setInvoices(invoicesList);
        if (clientsList.length > 0) {
          setClients(clientsList);
        } else {
          getUserAccount(currentUser.uid).then((account) => {
            const fromAccount = Array.isArray(account?.clients) ? account.clients : [];
            setClients(fromAccount);
          }).catch(() => setClients([]));
        }
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [currentUser?.uid, orgResolved, organization?.id]);

  const clientNameByClientId = useMemo(() => {
    const map = {};
    clients.forEach((c) => {
      const name = (c.name || c.companyName || 'Unnamed client').trim();
      if (c.id) map[c.id] = name;
    });
    return map;
  }, [clients]);

  const clientEmailByClientId = useMemo(() => {
    const map = {};
    clients.forEach((c) => {
      const email = (c.email && String(c.email).trim()) || '';
      if (c.id && email) map[c.id] = email;
    });
    return map;
  }, [clients]);

  const refreshInvoices = useCallback(() => {
    if (!currentUser?.uid || !orgResolved) return;
    const orgId = organization?.id ?? undefined;
    fetch('/api/get-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
    })
      .then((r) => r.json().then((d) => d.invoices || []))
      .then(setInvoices)
      .catch(() => {});
  }, [currentUser?.uid, orgResolved, organization?.id]);

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete || !currentUser?.uid) return;
    try {
      const res = await fetch('/api/delete-client-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          invoiceId: invoiceToDelete,
          organizationId: organization?.id ?? undefined,
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

  const handleSelectInvoice = (invoiceId) => {
    router.push(`/dashboard/invoices/${invoiceId}/edit`);
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Invoices - GoManagr</title>
        </Head>
        <InvoicesPageSkeleton />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Invoices - GoManagr</title>
        <meta name="description" content="Manage invoices" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Invoices"
          description="Invoices created for your clients. Add from here or from a client's Documents section."
          actions={
            <PrimaryButton
              type="button"
              className="gap-2"
              onClick={() => router.push('/dashboard/invoices/new')}
            >
              <HiPlus className="w-5 h-5" />
              Create invoice
            </PrimaryButton>
          }
        />

        {invoices.length === 0 ? (
          <EmptyStateCard
            message="No invoices yet"
            action={
              <PrimaryButton
                type="button"
                className="gap-2"
                onClick={() => router.push('/dashboard/invoices/new')}
              >
                <HiPlus className="w-5 h-5" />
                Create your first invoice
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {invoices.map((inv) => (
                <InvoiceCardServiceStyle
                  key={inv.id}
                  invoice={inv}
                  onSelect={handleSelectInvoice}
                  onDelete={setInvoiceToDelete}
                  onInvoiceUpdated={refreshInvoices}
                  clientNameByClientId={clientNameByClientId}
                  clientEmailByClientId={clientEmailByClientId}
                  defaultCurrency={defaultCurrency}
                  organization={organization}
                  userId={currentUser?.uid}
                />
              ))}
            </div>
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
        )}
      </div>
    </>
  );
}

export default function InvoicesPage() {
  return <InvoicesContent />;
}
