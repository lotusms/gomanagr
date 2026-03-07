import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft, HiDocumentText } from 'react-icons/hi';
import ClientProjectForm from '@/components/clients/add-client/ClientProjectForm';
import { getProjectTermForIndustry, getProjectTermSingular } from '@/components/clients/clientProfileConstants';

export default function EditClientProjectPage() {
  const router = useRouter();
  const { id: clientId, projectId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [project, setProject] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const projectTermPlural = getProjectTermForIndustry(accountIndustry);
  const projectTermSingular = getProjectTermSingular(projectTermPlural);
  const projectTermSingularLower = (projectTermSingular || 'project').toLowerCase();

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgReady(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid).then((data) => setUserAccount(data || null)).catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!orgReady || !currentUser?.uid || !projectId) return;
    setLoading(true);
    setNotFound(false);
    fetch('/api/get-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        organizationId: organization?.id ?? undefined,
        projectId,
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
        if (data?.project) setProject(data.project);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orgReady, currentUser?.uid, projectId, organization?.id]);

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=projects`;

  if (!currentUser?.uid || !clientId || !projectId) return null;

  if (loading) {
    return (
      <>
        <Head>
          <title>Edit {projectTermSingularLower} - GoManagr</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </>
    );
  }

  if (notFound || !project) {
    return (
      <>
        <Head>
          <title>{projectTermSingular} not found - GoManagr</title>
        </Head>
        <div className="space-y-6">
          <PageHeader
            title={`Edit ${projectTermSingularLower}`}
            description={`${projectTermPlural || 'Projects'} for this client.`}
            actions={
              <Link href={backUrl}>
                <SecondaryButton type="button" className="gap-2">
                  <HiArrowLeft className="w-5 h-5" />
                  Back to client
                </SecondaryButton>
              </Link>
            }
          />
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 shadow-sm p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <HiDocumentText className="w-8 h-8 text-amber-600 dark:text-amber-400" aria-hidden />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {projectTermSingular} not found
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              This {projectTermSingularLower} may have been deleted or you don&apos;t have access to it.
            </p>
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to client
              </SecondaryButton>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Edit {projectTermSingularLower} - GoManagr</title>
        <meta name="description" content={`Edit this ${projectTermSingularLower}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={`Edit ${projectTermSingularLower}`}
          description={`Update the details of this ${projectTermSingularLower}.`}
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
          <ClientProjectForm
            initial={project}
            clientId={project.client_id}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            projectId={projectId}
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
