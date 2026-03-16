import Head from 'next/head';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { HiArrowLeft, HiPrinter, HiMail } from 'react-icons/hi';

import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader, Paginator } from '@/components/ui';
import { IconButton, SecondaryButton } from '@/components/ui/buttons';
import ReceiptsPageSkeleton from '@/components/dashboard/ReceiptsPageSkeleton';
import ReceiptViewSkeleton from '@/components/dashboard/ReceiptViewSkeleton';
import ReceiptViewInPage from '@/components/dashboard/ReceiptViewInPage';
import EmptyStateCard from '@/components/clients/add-client/EmptyStateCard';
import ReceiptCard from '@/components/dashboard/ReceiptCard';
import { DocumentViewDialog } from '@/components/documents';
import { buildInvoiceDocumentPayload, buildCompanyForDocument } from '@/lib/buildDocumentPayload';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

function ReceiptsContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [clients, setClients] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const clientTermPlural = getTermForIndustry(accountIndustry, 'client');
  const clientTermSingularLower = (getTermSingular(clientTermPlural) || 'Client').toLowerCase();
  const unnamedClientLabel = `Unnamed ${clientTermSingularLower}`;
  const lineItemsSectionLabel = getTermForIndustry(accountIndustry, 'services');
  const company = useMemo(() => buildCompanyForDocument(userAccount, organization), [userAccount, organization]);

  const openInvoiceId = router.query.open && String(router.query.open).trim();
  const receiptToOpen = useMemo(
    () => (openInvoiceId && receipts.length > 0 ? receipts.find((r) => r.id === openInvoiceId) : null),
    [openInvoiceId, receipts]
  );

  const paginatedReceipts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return receipts.slice(start, start + itemsPerPage);
  }, [receipts, currentPage, itemsPerPage]);

  useEffect(() => {
    const totalPages = Math.ceil(receipts.length / itemsPerPage);
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [receipts.length, itemsPerPage, currentPage]);

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
        body: JSON.stringify({
          userId: currentUser.uid,
          organizationId: orgId,
          statuses: ['paid'],
        }),
      }).then((r) => r.json().then((d) => d.invoices || [])),
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      }).then((r) => r.json().then((d) => d.clients || [])),
    ])
      .then(([invoicesList, clientsList]) => {
        setReceipts(invoicesList);
        if (clientsList.length > 0) {
          setClients(clientsList);
        } else {
          getUserAccount(currentUser.uid).then((account) => {
            const fromAccount = Array.isArray(account?.clients) ? account.clients : [];
            setClients(fromAccount);
          }).catch(() => setClients([]));
        }
      })
      .catch(() => setReceipts([]))
      .finally(() => setLoading(false));
  }, [currentUser?.uid, orgResolved, organization?.id]);

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

  const refreshReceipts = useCallback(() => {
    if (!currentUser?.uid || !orgResolved) return;
    const orgId = organization?.id ?? undefined;
    fetch('/api/get-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        organizationId: orgId,
        statuses: ['paid'],
      }),
    })
      .then((r) => r.json().then((d) => d.invoices || []))
      .then(setReceipts)
      .catch(() => {});
  }, [currentUser?.uid, orgResolved, organization?.id]);

  if (loading) {
    return (
      <>
        <Head>
          <title>Receipts - GoManagr</title>
        </Head>
        {openInvoiceId ? <ReceiptViewSkeleton /> : <ReceiptsPageSkeleton />}
      </>
    );
  }

  const dateFormat = userAccount?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = userAccount?.timezone ?? 'UTC';

  return (
    <>
      <Head>
        <title>{receiptToOpen ? 'Receipt - GoManagr' : 'Receipts - GoManagr'}</title>
        <meta name="description" content={receiptToOpen ? 'View receipt.' : 'Paid invoices (receipts). View, print, or email.'} />
      </Head>

      <div className="space-y-6">
        {receiptToOpen ? (
          <>
            <PageHeader
              title="Receipt"
              description={receiptToOpen.invoice_number || receiptToOpen.invoice_title || 'View receipt'}
              actions={
                <>
                  <SecondaryButton type="button" onClick={() => router.push('/dashboard/receipts')} className="gap-2">
                    <HiArrowLeft className="w-4 h-4" />
                    Back to receipts
                  </SecondaryButton>
                  <IconButton 
                    type="button" 
                    onClick={() => setPrintDialogOpen(true)} 
                    className="gap-2" 
                    variant="light"
                    title="Print"
                    aria-label="Print receipt"
                  >
                    <HiPrinter className="w-5 h-5" />
                  </IconButton>
                  <IconButton 
                    type="button" 
                    onClick={() => router.push(`/dashboard/receipts/${receiptToOpen.id}/email`)} 
                    className="gap-2" 
                    variant="light"
                    title="Email"
                    aria-label="Email receipt"
                  >
                    <HiMail className="w-5 h-5" />
                  </IconButton>
                </>
              }
            />
            <ReceiptViewInPage
              document={buildInvoiceDocumentPayload(receiptToOpen)}
              client={{
                name: (receiptToOpen.client_id && clientNameByClientId[receiptToOpen.client_id]) || 'Client',
                email: (receiptToOpen.client_id && clientEmailByClientId[receiptToOpen.client_id]) || '',
              }}
              currency={defaultCurrency}
              lineItemsSectionLabel={lineItemsSectionLabel}
              dateFormat={dateFormat}
              timezone={timezone}
            />
            {printDialogOpen && (
              <DocumentViewDialog
                isOpen={printDialogOpen}
                onClose={() => setPrintDialogOpen(false)}
                type="receipt"
                document={buildInvoiceDocumentPayload(receiptToOpen)}
                company={company}
                client={{
                  name: (receiptToOpen.client_id && clientNameByClientId[receiptToOpen.client_id]) || 'Client',
                  email: (receiptToOpen.client_id && clientEmailByClientId[receiptToOpen.client_id]) || '',
                }}
                currency={defaultCurrency}
                lineItemsSectionLabel={lineItemsSectionLabel}
                amountPaid={
                  (Number(receiptToOpen.total) || 0) -
                  (receiptToOpen.outstanding_balance != null && String(receiptToOpen.outstanding_balance).trim() !== ''
                    ? Number(receiptToOpen.outstanding_balance)
                    : 0)
                }
                autoPrint={true}
              />
            )}
          </>
        ) : (
          <>
            <PageHeader
              title="Receipts"
              description="Paid invoices. View receipts in read-only form; print or email from each receipt."
            />

            {receipts.length === 0 ? (
              <EmptyStateCard message="No receipts yet" />
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {paginatedReceipts.map((inv) => (
                    <ReceiptCard
                      key={inv.id}
                      invoice={inv}
                      onReceiptUpdated={refreshReceipts}
                      clientNameByClientId={clientNameByClientId}
                      clientEmailByClientId={clientEmailByClientId}
                      defaultCurrency={defaultCurrency}
                      organization={organization}
                      userId={currentUser?.uid}
                      accountIndustry={accountIndustry}
                    />
                  ))}
                </div>
                {receipts.length > 6 && (
                  <Paginator
                    currentPage={currentPage}
                    totalItems={receipts.length}
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
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function ReceiptsPage() {
  return <ReceiptsContent />;
}
