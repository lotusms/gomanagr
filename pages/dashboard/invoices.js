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
import Tooltip from '@/components/ui/Tooltip';

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
  const [payoutBalance, setPayoutBalance] = useState({
    availableCents: 0,
    pendingCents: 0,
    currency: 'usd',
    livemode: false,
    upcomingPayoutArrivalDate: null,
    instantAvailableCents: 0,
  });
  const [payoutBalanceLoading, setPayoutBalanceLoading] = useState(false);
  const [payoutInProgress, setPayoutInProgress] = useState(false);
  const [payoutError, setPayoutError] = useState(null);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const clientTermPlural = getTermForIndustry(accountIndustry, 'client');
  const clientTermPluralLower = (clientTermPlural || 'clients').toLowerCase();
  const clientTermSingularLower = (getTermSingular(clientTermPlural) || 'Client').toLowerCase();
  const invoiceTermPlural = getTermForIndustry(accountIndustry, 'invoice');
  const invoiceTermSingular = getTermSingular(invoiceTermPlural) || 'Invoice';
  const invoiceTermPluralLower = (invoiceTermPlural || 'invoices').toLowerCase();
  const invoiceTermSingularLower = invoiceTermSingular.toLowerCase();
  const unnamedClientLabel = `Unnamed ${clientTermSingularLower}`;

  const hasPayoutBalance = payoutBalance.availableCents > 0 || payoutBalance.pendingCents > 0;
  const payoutTotal = payoutBalance.availableCents / 100;
  const pendingTotal = payoutBalance.pendingCents / 100;

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

  const fetchPayoutBalance = useCallback(() => {
    if (!currentUser?.uid) return;
    setPayoutBalanceLoading(true);
    setPayoutError(null);
    fetch('/api/stripe-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setPayoutError(data.error);
          setPayoutBalance({
            availableCents: 0,
            pendingCents: 0,
            currency: 'usd',
            livemode: false,
            upcomingPayoutArrivalDate: null,
            instantAvailableCents: 0,
          });
        } else {
          setPayoutBalance({
            availableCents: data.availableCents ?? 0,
            pendingCents: data.pendingCents ?? 0,
            currency: data.currency || 'usd',
            livemode: data.livemode === true,
            upcomingPayoutArrivalDate: data.upcomingPayoutArrivalDate ?? null,
            instantAvailableCents: data.instantAvailableCents ?? 0,
          });
        }
      })
      .catch(() => {
        setPayoutBalance({
          availableCents: 0,
          pendingCents: 0,
          currency: 'usd',
          livemode: false,
          upcomingPayoutArrivalDate: null,
          instantAvailableCents: 0,
        });
        setPayoutError('Could not load balance');
      })
      .finally(() => setPayoutBalanceLoading(false));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !orgResolved) return;
    fetchPayoutBalance();
  }, [currentUser?.uid, orgResolved, fetchPayoutBalance]);

  const handlePayout = useCallback(async (instant = false) => {
    if (!currentUser?.uid || payoutBalance.availableCents <= 0 || payoutInProgress) return;
    setPayoutInProgress(true);
    setPayoutError(null);
    try {
      const res = await fetch('/api/stripe-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          amountCents: payoutBalance.availableCents,
          instant: !!instant,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayoutError(data.error || 'Payout failed');
        return;
      }
      fetchPayoutBalance();
    } catch (err) {
      setPayoutError(err.message || 'Something went wrong');
    } finally {
      setPayoutInProgress(false);
    }
  }, [currentUser?.uid, payoutBalance.availableCents, payoutInProgress, fetchPayoutBalance]);

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
    // Only fully paid (balance 0) invoices open as receipt; partially paid still open in edit form
    if (inv && inv.status === 'paid') {
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
        {(hasPayoutBalance || payoutBalanceLoading) && (
          <div className="relative flex-col -top-9 flex items-center gap-2 bg-secondary-50 dark:bg-secondary-900 rounded-bl-lg rounded-br-lg p-4 shadow-sm border border-secondary-300 dark:border-secondary-500">
            <div className="flex flex-col items-center justify-between sm:flex-row gap-4 sm:gap-6 mt-6 sm:mt-2 w-full">
              {/* Balance summary */}
              <div className="flex flex-col min-w-0">
                {payoutBalanceLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                    <span className="text-sm font-medium">Loading balance…</span>
                  </div>
                ) : (
                  <>
                    {payoutBalance.availableCents > 0 && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-primary-600 dark:text-primary-400">
                          {formatCurrency(payoutTotal, defaultCurrency)}
                        </span>
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Available
                        </span>
                      </div>
                    )}
                    {payoutBalance.pendingCents > 0 && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-2xl font-semibold text-gray-500 dark:text-gray-400">
                          {formatCurrency(pendingTotal, defaultCurrency)}
                        </span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">pending</span>
                        <Tooltip
                          content={
                            payoutBalance.upcomingPayoutArrivalDate
                              ? `Funds will be transferred automatically on ${new Date(payoutBalance.upcomingPayoutArrivalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`
                              : 'Pending funds will be transferred according to your payout schedule.'
                          }
                          placement="bottom"
                        >
                          <span className="cursor-help inline-flex text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                            <HiOutlineInformationCircle className="size-4 shrink-0" aria-hidden />
                          </span>
                        </Tooltip>
                      </div>
                    )}
                  </>
                )}
              </div>


              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <SecondaryButton
                  type="button"
                  className="gap-2"
                  size="mini"
                  disabled={payoutBalance.availableCents <= 0 || payoutInProgress}
                  onClick={() => handlePayout(false)}
                >
                  {payoutInProgress ? 'Transferring…' : 'Pay out now'}
                </SecondaryButton>
                {payoutBalance.availableCents > 0 && payoutBalance.instantAvailableCents > 0 && (
                  <SecondaryButton
                    type="button"
                    className="gap-2"
                    size="mini"
                    disabled={payoutInProgress}
                    onClick={() => handlePayout(true)}
                  >
                    {payoutInProgress ? '…' : 'Transfer instantly (1% fee)'}
                  </SecondaryButton>
                )}
              </div>
            </div>

            {/* Footer: error + test mode */}
            {(payoutError || (!payoutBalance.livemode && hasPayoutBalance)) && (
              <div className="border-t border-secondary-200 dark:border-secondary-600 flex flex-col gap-1">
                {payoutError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{payoutError}</p>
                )}
                {/* {!payoutBalance.livemode && hasPayoutBalance && (
                  <p className="pt-3 text-xs text-amber-600 dark:text-amber-400">Test mode — no real transfer</p>
                )} */}
              </div>
            )}
          </div>
        )}
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
