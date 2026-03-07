import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';
import ClientInvoiceForm from '@/components/clients/add-client/ClientInvoiceForm';

export default function NewInvoicePage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [ready, setReady] = useState(false);

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
    if (router.isReady) setReady(true);
  }, [router.isReady]);

  const backUrl = '/dashboard/invoices';

  if (!ready || !currentUser?.uid) return null;

  if (!orgResolved) {
    return (
      <>
        <Head>
          <title>Create invoice - GoManagr</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Create invoice - GoManagr</title>
        <meta name="description" content="Create a new invoice for a client" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Create invoice"
          description="Create an invoice for a client. Select the client this invoice is for."
          actions={
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to invoices
              </SecondaryButton>
            </Link>
          }
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <ClientInvoiceForm
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            industry={organization?.industry ?? null}
            defaultCurrency={defaultCurrency}
            showClientDropdown={true}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
