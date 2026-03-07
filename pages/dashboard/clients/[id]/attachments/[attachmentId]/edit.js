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
import ClientAttachmentForm from '@/components/clients/add-client/ClientAttachmentForm';

export default function EditClientAttachmentPage() {
  const router = useRouter();
  const { id: clientId, attachmentId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [attachment, setAttachment] = useState(null);
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
    if (!orgReady || !currentUser?.uid || !clientId || !attachmentId) return;

    setLoading(true);
    setNotFound(false);
    fetch('/api/get-client-attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        clientId,
        organizationId: organization?.id ?? undefined,
        attachmentId,
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
        if (data?.attachment) setAttachment(data.attachment);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orgReady, currentUser?.uid, clientId, attachmentId, organization?.id]);

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=documents&section=attachments`;

  if (!currentUser?.uid || !clientId || !attachmentId) {
    return null;
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Edit attachment - GoManagr</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </>
    );
  }

  if (notFound || !attachment) {
    return (
      <>
        <Head>
          <title>Attachment not found - GoManagr</title>
        </Head>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">Attachment not found.</p>
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
        <title>Edit attachment - GoManagr</title>
        <meta name="description" content="Edit this attachment" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Edit attachment"
          description="Update the details of this attachment."
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
          <ClientAttachmentForm
            initial={attachment}
            clientId={clientId}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            attachmentId={attachmentId}
            industry={industry}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
