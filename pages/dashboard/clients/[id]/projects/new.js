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
import ClientProjectForm from '@/components/clients/add-client/ClientProjectForm';
import { getProjectTermForIndustry, getProjectTermSingular, getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

export default function NewClientProjectPage() {
  const router = useRouter();
  const { id: clientId, status: statusQuery } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [ready, setReady] = useState(false);

  const initialStatus =
    statusQuery === 'completed' ? 'completed' : statusQuery === 'active' ? 'active' : 'planning';

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const projectTermPlural = getProjectTermForIndustry(accountIndustry);
  const projectTermSingular = getProjectTermSingular(projectTermPlural);
  const projectTermSingularLower = (projectTermSingular || 'project').toLowerCase();
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

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=projects`;

  if (!ready || !currentUser?.uid) return null;

  return (
    <>
      <Head>
        <title>Add {projectTermSingularLower} - GoManagr</title>
        <meta name="description" content={`Add a ${projectTermSingularLower} for this ${clientTermSingularLower}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={`Add ${projectTermSingularLower}`}
          description={`Create a ${projectTermSingularLower} for this ${clientTermSingularLower}.`}
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
          <ClientProjectForm
            initial={{ status: initialStatus }}
            clientId={clientId}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            industry={accountIndustry}
            showClientDropdown={false}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
