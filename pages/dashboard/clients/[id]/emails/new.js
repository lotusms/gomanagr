import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';
import ClientEmailForm from '@/components/clients/add-client/ClientEmailForm';

export default function NewClientEmailPage() {
  const router = useRouter();
  const { id: clientId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((org) => setOrganization(org || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (router.isReady && clientId) setReady(true);
  }, [router.isReady, clientId]);

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=communication`;
  const onSuccess = () => router.push(backUrl);
  const onCancel = () => router.push(backUrl);

  if (!ready || !currentUser?.uid) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Add email - GoManagr</title>
        <meta name="description" content="Log an email for this client" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Add email"
          description="Log an email in this client’s communications."
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
          <ClientEmailForm
            clientId={clientId}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </div>
      </div>
    </>
  );
}
