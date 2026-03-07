import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft, HiDocumentText } from 'react-icons/hi';
import ClientInvoiceForm from '@/components/clients/add-client/ClientInvoiceForm';
import InvoicePaymentSummary from '@/components/invoices/InvoicePaymentSummary';

export default function EditClientInvoicePage() {
  const router = useRouter();
  const { id: clientId, invoiceId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchInvoice = useCallback(() => {
    if (!currentUser?.uid || !clientId || !invoiceId || !orgReady) return;
    return fetch('/api/get-client-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        clientId,
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
  }, [currentUser?.uid, clientId, invoiceId, orgReady, organization?.id]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((org) => setOrganization(org || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgReady(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !clientId) return;
    getUserAccount(currentUser.uid)
      .then((account) => {
        const client = account?.clients?.find((c) => c.id === clientId);
        const currency =
          client?.defaultCurrency ||
          account?.clientSettings?.defaultCurrency ||
          'USD';
        setDefaultCurrency(currency);
      })
      .catch(() => setDefaultCurrency('USD'));
  }, [currentUser?.uid, clientId]);

  useEffect(() => {
    if (!orgReady || !currentUser?.uid || !clientId || !invoiceId) return;

    setLoading(true);
    setNotFound(false);
    fetch('/api/get-client-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        clientId,
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
  }, [orgReady, currentUser?.uid, clientId, invoiceId, organization?.id]);

  useEffect(() => {
    if (!clientId || !currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((account) => {
        const client = account?.clients?.find((c) => c.id === clientId);
        if (client) {
          setClientEmail((client.email && String(client.email).trim()) || '');
          setClientName(
            (client.name || client.companyName || '').trim() ||
            [client.firstName, client.lastName].filter(Boolean).join(' ') ||
            ''
          );
        }
      })
      .catch(() => {});
  }, [clientId, currentUser?.uid]);

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=documents&section=invoices`;

  if (!currentUser?.uid || !clientId || !invoiceId) {
    return null;
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Edit invoice - GoManagr</title>
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
          <title>Invoice not found - GoManagr</title>
        </Head>
        <div className="space-y-6">
          <PageHeader
            title="Edit invoice"
            description="Invoices for this client."
            actions={
              <Link href={backUrl}>
                <SecondaryButton type="button" className="gap-2">
                  <HiArrowLeft className="w-5 h-5" />
                  Back to client
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Invoice not found</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              This invoice may have been deleted or you don&apos;t have access to it.
            </p>
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to client
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
        <title>Edit invoice - GoManagr</title>
        <meta name="description" content="Edit this invoice" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Edit invoice"
          description="Update the details of this invoice."
          actions={
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to client
              </SecondaryButton>
            </Link>
          }
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
          />
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
            <ClientInvoiceForm
              initial={invoice}
              clientId={clientId}
              userId={currentUser.uid}
              organizationId={organization?.id ?? null}
              invoiceId={invoiceId}
              industry={organization?.industry ?? null}
              defaultCurrency={defaultCurrency}
              onSuccess={() => router.push(backUrl)}
              onCancel={() => router.push(backUrl)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
