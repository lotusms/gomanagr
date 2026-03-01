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
import ClientContractForm from '@/components/clients/add-client/ClientContractForm';

export default function NewClientContractPage() {
  const router = useRouter();
  const { id: clientId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((o) => setOrganization(o || null)).catch(() => setOrganization(null));
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
    if (router.isReady && clientId) setReady(true);
  }, [router.isReady, clientId]);

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=documents&section=contracts`;

  if (!ready || !currentUser?.uid) return null;

  return (
    <>
      <Head>
        <title>Add contract - GoManagr</title>
        <meta name="description" content="Add a contract for this client" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Add contract"
          description="Record a new contract for this client."
          actions={
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to client
              </SecondaryButton>
            </Link>
          }
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <ClientContractForm
            clientId={clientId}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            defaultCurrency={defaultCurrency}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
