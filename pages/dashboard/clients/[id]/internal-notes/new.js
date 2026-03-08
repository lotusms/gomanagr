import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';
import ClientInternalNoteForm from '@/components/clients/add-client/ClientInternalNoteForm';

export default function NewClientInternalNotePage() {
  const router = useRouter();
  const { id: clientId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [ready, setReady] = useState(false);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const clientTermSingular = getTermSingular(getTermForIndustry(accountIndustry, 'client')) || 'Client';
  const clientTermSingularLower = clientTermSingular.toLowerCase();

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((o) => setOrganization(o || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid).then((data) => setUserAccount(data || null)).catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (router.isReady && clientId) setReady(true);
  }, [router.isReady, clientId]);

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=communication&section=internalNotes`;

  if (!ready || !currentUser?.uid) return null;

  return (
    <>
      <Head>
        <title>Add internal note - GoManagr</title>
        <meta name="description" content={`Add a private internal note for this ${clientTermSingularLower}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Add internal note"
          description={`Private note—not visible to the ${clientTermSingularLower}.`}
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
          <ClientInternalNoteForm
            clientId={clientId}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            industry={accountIndustry}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
