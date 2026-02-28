import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';
import ClientProposalForm from '@/components/clients/add-client/ClientProposalForm';

export default function EditClientProposalPage() {
  const router = useRouter();
  const { id: clientId, proposalId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((org) => setOrganization(org || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgReady(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!orgReady || !currentUser?.uid || !clientId || !proposalId) return;

    setLoading(true);
    setNotFound(false);
    fetch('/api/get-client-proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        clientId,
        organizationId: organization?.id ?? undefined,
        proposalId,
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
        if (data?.proposal) setProposal(data.proposal);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orgReady, currentUser?.uid, clientId, proposalId, organization?.id]);

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=documents&section=proposals`;

  if (!currentUser?.uid || !clientId || !proposalId) {
    return null;
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Edit proposal - GoManagr</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </>
    );
  }

  if (notFound || !proposal) {
    return (
      <>
        <Head>
          <title>Proposal not found - GoManagr</title>
        </Head>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">Proposal not found.</p>
          <Link href={backUrl}>
            <SecondaryButton type="button" className="gap-2">
              <HiArrowLeft className="w-5 h-5" />
              Back to client
            </SecondaryButton>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Edit proposal - GoManagr</title>
        <meta name="description" content="Edit this proposal" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Edit proposal"
          description="Update the details of this proposal."
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
          <ClientProposalForm
            initial={proposal}
            clientId={clientId}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            proposalId={proposalId}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
