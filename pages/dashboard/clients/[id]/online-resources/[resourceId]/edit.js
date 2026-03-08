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
import { getUserAccount } from '@/services/userService';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

export default function EditClientOnlineResourcePage() {
  const router = useRouter();
  const { id: clientId, resourceId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const clientTermSingular = getTermSingular(getTermForIndustry(accountIndustry, 'client')) || 'Client';

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((org) => setOrganization(org || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgReady(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid).then((data) => setUserAccount(data || null)).catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!orgReady || !currentUser?.uid || !clientId || !resourceId) return;

    setLoading(true);
    setNotFound(false);
    fetch('/api/get-client-online-resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        clientId,
        organizationId: organization?.id ?? undefined,
        resourceId,
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
        if (data?.resource) setResource(data.resource);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orgReady, currentUser?.uid, clientId, resourceId, organization?.id]);

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=documents&section=onlineResources`;

  if (!currentUser?.uid || !clientId || !resourceId) {
    return null;
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Edit online resource - GoManagr</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </>
    );
  }

  if (notFound || !resource) {
    return (
      <>
        <Head>
          <title>Online resource not found - GoManagr</title>
        </Head>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">Online resource not found.</p>
          <Link href={backUrl}>
            <SecondaryButton type="button" className="gap-2">
              <HiArrowLeft className="w-5 h-5" />
              Back to {clientTermSingular}
            </SecondaryButton>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Edit online resource - GoManagr</title>
        <meta name="description" content="Edit this online resource" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Edit online resource"
          description="Update the details of this resource."
          actions={
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {clientTermSingular}
              </SecondaryButton>
            </Link>
          }
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <ClientOnlineResourceForm
            initial={resource}
            clientId={clientId}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            resourceId={resourceId}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
