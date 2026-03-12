import Head from 'next/head';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader, ConfirmationDialog, Paginator } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import InvoicesPageSkeleton from '@/components/dashboard/InvoicesPageSkeleton';
import EmptyStateCard from '@/components/clients/add-client/EmptyStateCard';
import InvoiceCardServiceStyle from '@/components/dashboard/InvoiceCardServiceStyle';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import { HiOutlineInformationCircle, HiPlus } from 'react-icons/hi';
import { formatCurrency } from '@/utils/formatCurrency';

const PAYOUT_AMOUNT = 1000;

function InvoicesContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [showPayoutInfo, setShowPayoutInfo] = useState(false);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const clientTermPlural = getTermForIndustry(accountIndustry, 'client');
  const clientTermPluralLower = (clientTermPlural || 'clients').toLowerCase();
  const clientTermSingularLower = (getTermSingular(clientTermPlural) || 'Client').toLowerCase();
  const invoiceTermPlural = getTermForIndustry(accountIndustry, 'invoice');
  const invoiceTermSingular = getTermSingular(invoiceTermPlural) || 'Invoice';
  const invoiceTermPluralLower = (invoiceTermPlural || 'invoices').toLowerCase();
  const invoiceTermSingularLower = invoiceTermSingular.toLowerCase();
  const unnamedClientLabel = `Unnamed ${clientTermSingularLower}`;

  const payoutTotal = PAYOUT_AMOUNT;

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return invoices.slice(start, start + itemsPerPage);
  }, [invoices, currentPage, itemsPerPage]);

  useEffect(() => {
    const totalPages = Math.ceil(invoices.length / itemsPerPage);
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [invoices.length, itemsPerPage, currentPage]);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

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
        setUserAccount(account || null);
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

  useEffect(() => {
    //if stripe reports that there is a balance that can be transferred to the user's bank account, show the payout info
    
  }, []);

  const clientNameByClientId = useMemo(() => {
    const map = {};
    clients.forEach((c) => {
      const name = (c.name || c.companyName || unnamedClientLabel).trim();
      if (c.id) map[c.id] = name;
    });
    return map;
  }, [clients, unnamedClientLabel]);

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
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv && (inv.status === 'paid' || inv.status === 'partially_paid')) {
      router.push(`/dashboard/receipts?open=${encodeURIComponent(invoiceId)}`);
    } else {
      router.push(`/dashboard/invoices/${invoiceId}/edit`);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>{invoiceTermPlural} - GoManagr</title>
        </Head>
        <InvoicesPageSkeleton />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{invoiceTermPlural} - GoManagr</title>
        <meta name="description" content={`Manage ${invoiceTermPluralLower}`} />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title={invoiceTermPlural}
          description={`${invoiceTermPlural} created for your ${clientTermPluralLower}. Add from here or from a ${clientTermSingularLower}'s Documents section.`}
          actions={
            <>
              <PrimaryButton
                type="button"
                className="gap-2"
                onClick={() => router.push('/dashboard/invoices/new')}
              >
                <HiPlus className="w-5 h-5" />
                Create {invoiceTermSingularLower}
              </PrimaryButton>

              {showPayoutInfo && (
                <div className="relative flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div classNAme="relative top-0 right-0">
                    <HiOutlineInformationCircle className="absolute top-1 right-1 size-4 text-gray-500 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold text-primary-500 dark:text-primary-400">{formatCurrency(payoutTotal, defaultCurrency)}</p>
                    </div>
                    <SecondaryButton
                      type="button"
                      className="gap-2"
                      size="mini"
                      onClick={() => alert('Coming soon!')}
                    >
                      Pay out now
                    </SecondaryButton>
                  </div>
                </div>
              )}
            </>
          }
        />

        {invoices.length === 0 ? (
          <EmptyStateCard
            message={`No ${invoiceTermPluralLower} yet`}
            action={
              <PrimaryButton
                type="button"
                className="gap-2"
                onClick={() => router.push('/dashboard/invoices/new')}
              >
                <HiPlus className="w-5 h-5" />
                Create your first {invoiceTermSingularLower}
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paginatedInvoices.map((inv) => (
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
                  accountIndustry={accountIndustry}
                />
              ))}
            </div>
            {invoices.length > 6 && (
              <Paginator
                currentPage={currentPage}
                totalItems={invoices.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[6, 12, 24, 48, 96]}
                showItemsPerPage={true}
                maxVisiblePages={5}
                showInfo={false}
                showFirstLast={false}
                className="mt-6"
              />
            )}
            <ConfirmationDialog
              isOpen={!!invoiceToDelete}
              onClose={() => setInvoiceToDelete(null)}
              onConfirm={handleDeleteConfirm}
              title={`Delete ${invoiceTermSingular}`}
              message={`This ${invoiceTermSingularLower} will be permanently deleted. This cannot be undone.`}
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
