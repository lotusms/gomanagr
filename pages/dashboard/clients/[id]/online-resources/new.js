import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';
import ClientOnlineResourceForm from '@/components/clients/add-client/ClientOnlineResourceForm';

export default function NewClientOnlineResourcePage() {
  const router = useRouter();
  const { id: clientId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((o) => setOrganization(o || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (router.isReady && clientId) setReady(true);
  }, [router.isReady, clientId]);

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=documents&section=onlineResources`;

  if (!ready || !currentUser?.uid) return null;

  return (
    <>
      <Head>
        <title>Add online resource - GoManagr</title>
        <meta name="description" content="Add an online resource for this client" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Add online resource"
          description="Add a link, portal, or web reference for this client."
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
          <ClientOnlineResourceForm
            clientId={clientId}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
