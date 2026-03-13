import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';
import ReceiptViewInPage from '@/components/dashboard/ReceiptViewInPage';
import { buildInvoiceDocumentPayload, buildCompanyForDocument } from '@/lib/buildDocumentPayload';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

function parseNum(v) {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export default function PartialReceiptPage() {
  const router = useRouter();
  const { invoiceId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const clientTermSingularLower = (getTermSingular(getTermForIndustry(accountIndustry, 'client')) || 'client').toLowerCase();
  const invoiceTermPlural = getTermForIndustry(accountIndustry, 'invoice');
  const invoiceTermSingular = getTermSingular(invoiceTermPlural) || 'Invoice';
  const invoiceTermPluralLower = (invoiceTermPlural || 'invoices').toLowerCase();

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
        setDefaultCurrency(account?.clientSettings?.defaultCurrency || 'USD');
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

  useEffect(() => {
    if (!invoice?.client_id || !currentUser?.uid) return;
    const setEmailAndName = (client) => {
      if (!client) return;
      setClientEmail((client.email && String(client.email).trim()) || '');
      setClientName(
        (client.name || client.companyName || '').trim() ||
        [client.firstName, client.lastName].filter(Boolean).join(' ') ||
        'Client'
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
          if (!client) setClientName('Client');
        })
        .catch(() => setClientName('Client'));
    } else {
      getUserAccount(currentUser.uid)
        .then((account) => {
          const clients = Array.isArray(account?.clients) ? account.clients : [];
          const client = clients.find((c) => c.id === invoice.client_id);
          setEmailAndName(client);
          if (!client) setClientName('Client');
        })
        .catch(() => setClientName('Client'));
    }
  }, [invoice?.client_id, currentUser?.uid, organization?.id]);

  const total = invoice ? parseNum(invoice.total ?? invoice.amount) : 0;
  const rawBalance = invoice?.outstanding_balance;
  const hasBalanceSet = rawBalance != null && String(rawBalance).trim() !== '';
  const balanceDue = hasBalanceSet ? parseNum(rawBalance) : total;
  const amountPaid = total - balanceDue;
  const dateFormat = userAccount?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = userAccount?.timezone ?? 'UTC';
  const company = buildCompanyForDocument(userAccount, organization);
  const lineItemsSectionLabel = getTermForIndustry(accountIndustry, 'services');

  if (!currentUser?.uid || !invoiceId) return null;

  if (loading) {
    return (
      <>
        <Head><title>Partial payment receipt - GoManagr</title></Head>
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
        <Head><title>{invoiceTermSingular} not found - GoManagr</title></Head>
        <div className="space-y-6">
          <PageHeader
            title="Partial payment receipt"
            description="This receipt is for a partial payment on an invoice."
            actions={
              <Link href="/dashboard/invoices">
                <SecondaryButton type="button" className="gap-2">
                  <HiArrowLeft className="w-5 h-5" />
                  Back to {invoiceTermPluralLower}
                </SecondaryButton>
              </Link>
            }
          />
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">{invoiceTermSingular} not found or no partial payment to show.</p>
            <Link href="/dashboard/invoices" className="mt-4 inline-block">
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

  if (amountPaid <= 0) {
    return (
      <>
        <Head><title>Partial payment receipt - GoManagr</title></Head>
        <div className="space-y-6">
          <PageHeader
            title="Partial payment receipt"
            description="No partial payment has been made on this invoice yet."
            actions={
              <Link href={`/dashboard/invoices/${invoiceId}/edit`}>
                <SecondaryButton type="button" className="gap-2">
                  <HiArrowLeft className="w-5 h-5" />
                  Back to {invoiceTermSingular}
                </SecondaryButton>
              </Link>
            }
          />
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">This invoice has no partial payment recorded. Pay the invoice to see a receipt here.</p>
            <Link href={`/dashboard/invoices/${invoiceId}/edit`} className="mt-4 inline-block">
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {invoiceTermSingular}
              </SecondaryButton>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const document = buildInvoiceDocumentPayload(invoice);

  return (
    <>
      <Head>
        <title>Partial payment receipt - GoManagr</title>
        <meta name="description" content="Receipt for the portion already paid on this invoice." />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Partial Payment Receipt"
          description={`Receipt for the portion already paid on ${invoice.invoice_number || invoice.invoice_title || 'this invoice'}.`}
          actions={
            <Link href={`/dashboard/invoices/${invoiceId}/edit`}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {invoiceTermSingular}
              </SecondaryButton>
            </Link>
          }
        />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700 overflow-hidden min-w-0">
          <div className="p-4 sm:p-6 border-b border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20">
            <div className="flex flex-wrap gap-6 sm:gap-8 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Amount paid ({defaultCurrency}): </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {new Intl.NumberFormat(undefined, { style: 'currency', currency: defaultCurrency }).format(amountPaid)}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Remaining balance ({defaultCurrency}): </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat(undefined, { style: 'currency', currency: defaultCurrency }).format(balanceDue)}
                </span>
              </div>
            </div>
          </div>
          <ReceiptViewInPage
            document={document}
            client={{ name: clientName, email: clientEmail }}
            currency={defaultCurrency}
            lineItemsSectionLabel={lineItemsSectionLabel}
            dateFormat={dateFormat}
            timezone={timezone}
            isPartialReceipt={true}
            partialAmountPaid={amountPaid}
            partialBalanceRemaining={balanceDue}
          />
        </div>
      </div>
    </>
  );
}
