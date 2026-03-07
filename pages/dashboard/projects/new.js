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
import { getProjectTermForIndustry, getProjectTermSingular } from '@/components/clients/clientProfileConstants';

export default function NewProjectPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [ready, setReady] = useState(false);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const projectTermPlural = getProjectTermForIndustry(accountIndustry);
  const projectTermSingular = getProjectTermSingular(projectTermPlural);
  const projectTermSingularLower = (projectTermSingular || 'project').toLowerCase();

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((o) => setOrganization(o || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid).then((data) => setUserAccount(data || null)).catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (router.isReady) setReady(true);
  }, [router.isReady]);

  const backUrl = '/dashboard/projects';

  if (!ready || !currentUser?.uid) return null;

  const backLabel = (projectTermPlural || 'Projects').toLowerCase();

  return (
    <>
      <Head>
        <title>Create {projectTermSingularLower} - GoManagr</title>
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={'Create ' + projectTermSingularLower}
          description={'Create a ' + projectTermSingularLower + ' for a client. Select the client.'}
          actions={
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {backLabel}
              </SecondaryButton>
            </Link>
          }
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <ClientProjectForm
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            industry={accountIndustry}
            showClientDropdown={true}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
