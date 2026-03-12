import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader, UnsavedChangesPaginationDialog } from '@/components/ui';
import { SecondaryButton, IconButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft, HiChevronLeft, HiChevronRight, HiDocumentText } from 'react-icons/hi';
import ClientInvoiceForm from '@/components/clients/add-client/ClientInvoiceForm';
import InvoicePaymentSummary from '@/components/invoices/InvoicePaymentSummary';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

export default function EditInvoicePage() {
  const router = useRouter();
  const { invoiceId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formHasChanges, setFormHasChanges] = useState(false);
  const [ids, setIds] = useState([]);
  const [pendingNavigateToId, setPendingNavigateToId] = useState(null);
  const [paginationDialogOpen, setPaginationDialogOpen] = useState(false);
  const [paginationTargetId, setPaginationTargetId] = useState(null);
  const [paginationDirection, setPaginationDirection] = useState('next');
  const formRef = useRef(null);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const clientTermPluralLower = (getTermForIndustry(accountIndustry, 'client') || 'clients').toLowerCase();
  const clientTermSingularLower = (getTermSingular(getTermForIndustry(accountIndustry, 'client')) || 'client').toLowerCase();
  const invoiceTermPlural = getTermForIndustry(accountIndustry, 'invoice');
  const invoiceTermSingular = getTermSingular(invoiceTermPlural) || 'Invoice';
  const invoiceTermPluralLower = (invoiceTermPlural || 'invoices').toLowerCase();
  const invoiceTermSingularLower = invoiceTermSingular.toLowerCase();

  const fetchInvoice = useCallback(() => {
    if (!currentUser?.uid || !invoiceId || !orgReady) return;
    return fetch('/api/get-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        organizationId: organization?.id ?? undefined,
        invoiceId,
      }),
    })
      .then((res) => {
        if (res.status === 404) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.invoice) setInvoice(data.invoice);
      })
      .catch(() => {});
  }, [currentUser?.uid, invoiceId, orgReady, organization?.id]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgReady(true));
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
    if (!orgReady || !currentUser?.uid || !invoiceId) return;
    setLoading(true);
    setNotFound(false);
    fetch('/api/get-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        organizationId: organization?.id ?? undefined,
        invoiceId,
      }),
    })
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.invoice) setInvoice(data.invoice);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orgReady, currentUser?.uid, invoiceId, organization?.id]);

  // When invoice is loaded and not paid, sync payment status from Stripe (fixes webhook/success-page misses).
  const syncRequestedRef = useRef(false);
  useEffect(() => {
    if (!invoice?.id || !currentUser?.uid || invoice.status === 'paid') return;
    if (syncRequestedRef.current) return;
    syncRequestedRef.current = true;
    fetch('/api/sync-invoice-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId: invoice.id,
        userId: currentUser.uid,
        organizationId: organization?.id ?? undefined,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data?.synced) fetchInvoice();
      })
      .catch(() => {});
  }, [invoice?.id, invoice?.status, currentUser?.uid, organization?.id, fetchInvoice]);

  useEffect(() => {
    if (!invoice?.client_id || !currentUser?.uid) return;
    const setEmailAndName = (client) => {
      if (!client) return;
      setClientEmail((client.email && String(client.email).trim()) || '');
      setClientName(
        (client.name || client.companyName || '').trim() ||
        [client.firstName, client.lastName].filter(Boolean).join(' ') ||
        ''
      );
    };
    if (organization?.id) {
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      })
        .then((res) => res.json())
        .then((data) => {
          const clients = Array.isArray(data?.clients) ? data.clients : [];
          const client = clients.find((c) => c.id === invoice.client_id);
          setEmailAndName(client);
        })
        .catch(() => {});
    } else {
      getUserAccount(currentUser.uid)
        .then((account) => {
          const clients = Array.isArray(account?.clients) ? account.clients : [];
          const client = clients.find((c) => c.id === invoice.client_id);
          setEmailAndName(client);
        })
        .catch(() => {});
    }
  }, [invoice?.client_id, currentUser?.uid, organization?.id]);

  useEffect(() => {
    if (!orgReady || !currentUser?.uid) return;
    fetch('/api/get-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        organizationId: organization?.id ?? undefined,
      }),
    })
      .then((res) => res.ok ? res.json() : { invoices: [] })
      .then((data) => setIds((data.invoices || []).map((i) => i.id)))
      .catch(() => setIds([]));
  }, [orgReady, currentUser?.uid, organization?.id]);

  const currentIndex = invoiceId ? ids.indexOf(invoiceId) : -1;
  const prevId = currentIndex > 0 ? ids[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null;
  const editPath = (id) => `/dashboard/invoices/${id}/edit`;

  const handleSaveAndGoToPagination = useCallback(() => {
    if (paginationTargetId) {
      setPendingNavigateToId(paginationTargetId);
      setPaginationDialogOpen(false);
      setPaginationTargetId(null);
      if (formRef.current && typeof formRef.current.requestSubmit === 'function') {
        formRef.current.requestSubmit();
      }
    }
  }, [paginationTargetId]);

  const handleDiscardAndGoToPagination = useCallback(() => {
    if (paginationTargetId) {
      setPaginationDialogOpen(false);
      setPaginationTargetId(null);
      router.push(editPath(paginationTargetId));
    }
  }, [paginationTargetId, router]);

  const openPaginationDialog = (direction, targetId) => {
    setPaginationDirection(direction);
    setPaginationTargetId(targetId);
    setPaginationDialogOpen(true);
  };

  const goToPrev = () => {
    if (!prevId) return;
    if (formHasChanges) openPaginationDialog('previous', prevId);
    else router.push(editPath(prevId));
  };

  const goToNext = () => {
    if (!nextId) return;
    if (formHasChanges) openPaginationDialog('next', nextId);
    else router.push(editPath(nextId));
  };

  const backUrl = '/dashboard/invoices';
  const handleSuccess = useCallback(() => {
    if (pendingNavigateToId) {
      router.push(editPath(pendingNavigateToId));
      setPendingNavigateToId(null);
    } else {
      router.push(backUrl);
    }
  }, [pendingNavigateToId, router]);

  if (!currentUser?.uid || !invoiceId) return null;

  if (loading) {
    return (
      <>
        <Head>
          <title>Edit {invoiceTermSingularLower} - GoManagr</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </>
    );
  }

  if (notFound || !invoice) {
    return (
      <>
        <Head>
          <title>{invoiceTermSingular} not found - GoManagr</title>
        </Head>
        <div className="space-y-6">
          <PageHeader
            title={invoiceTermPlural}
            description={`${invoiceTermPlural} created for your ${clientTermPluralLower}.`}
            actions={
              <Link href={backUrl}>
                <SecondaryButton type="button" className="gap-2">
                  <HiArrowLeft className="w-5 h-5" />
                  Back to {invoiceTermPluralLower}
                </SecondaryButton>
              </Link>
            }
          />
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 shadow-sm p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <HiDocumentText className="w-8 h-8 text-amber-600 dark:text-amber-400" aria-hidden />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{invoiceTermSingular} not found</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              This {invoiceTermSingularLower} may have been deleted or you don&apos;t have access to it.
            </p>
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {invoiceTermPluralLower}
              </SecondaryButton>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Edit {invoiceTermSingularLower} - GoManagr</title>
        <meta name="description" content={`Edit this ${invoiceTermSingularLower}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={`Edit ${invoiceTermSingular}`}
          description={`Update the details of this ${invoiceTermSingularLower}. You can change the linked ${clientTermSingularLower} if needed.`}
          actions={
            <div className="flex items-center gap-2">
              <Link href={backUrl}>
                <SecondaryButton type="button" className="gap-2">
                  <HiArrowLeft className="w-5 h-5" />
                  Back to {invoiceTermPluralLower}
                </SecondaryButton>
              </Link>
              <div className="flex items-center border-l-2 border-primary-900/10 dark:border-primary-300/30 h-6 -ps-2"/>
              <IconButton onClick={goToPrev} disabled={!prevId} aria-label={`Previous ${invoiceTermSingularLower}`} title={`Previous ${invoiceTermSingularLower}`}>
                <HiChevronLeft className="w-5 h-5" />
              </IconButton>
              <IconButton onClick={goToNext} disabled={!nextId} aria-label={`Next ${invoiceTermSingularLower}`} title={`Next ${invoiceTermSingularLower}`}>
                <HiChevronRight className="w-5 h-5" />
              </IconButton>
            </div>
          }
        />
        <UnsavedChangesPaginationDialog
          isOpen={paginationDialogOpen}
          onClose={() => { setPaginationDialogOpen(false); setPaginationTargetId(null); }}
          onSaveAndGo={handleSaveAndGoToPagination}
          onDiscardAndGo={handleDiscardAndGoToPagination}
          direction={paginationDirection}
          itemNameSingular={invoiceTermSingularLower}
        />
        <div className="space-y-6">
          <InvoicePaymentSummary
            invoice={invoice}
            defaultCurrency={defaultCurrency}
            clientEmail={clientEmail}
            clientName={clientName}
            onInvoiceUpdated={fetchInvoice}
            organizationId={organization?.id ?? null}
            userId={currentUser.uid}
            industry={accountIndustry}
          />
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
            <ClientInvoiceForm
              ref={formRef}
              initial={invoice}
              clientId={invoice.client_id}
              userId={currentUser.uid}
              organizationId={organization?.id ?? null}
              invoiceId={invoiceId}
              industry={accountIndustry}
              defaultCurrency={defaultCurrency}
              showClientDropdown={true}
              onSuccess={handleSuccess}
              onCancel={() => router.push(backUrl)}
              onHasChangesChange={setFormHasChanges}
            />
          </div>
        </div>
      </div>
    </>
  );
}
