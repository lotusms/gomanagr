import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader, UnsavedChangesPaginationDialog } from '@/components/ui';
import { SecondaryButton, IconButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft, HiChevronLeft, HiChevronRight, HiDocumentText } from 'react-icons/hi';
import ClientProjectForm from '@/components/clients/add-client/ClientProjectForm';
import { getProjectTermForIndustry, getProjectTermSingular, getTermForIndustry } from '@/components/clients/clientProfileConstants';

export default function EditProjectPage() {
  const router = useRouter();
  const { projectId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [project, setProject] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formHasChanges, setFormHasChanges] = useState(false);
  const [ids, setIds] = useState([]);
  const [pendingNavigateToId, setPendingNavigateToId] = useState(null);
  const [paginationDialogOpen, setPaginationDialogOpen] = useState(false);
  const [paginationTargetId, setPaginationTargetId] = useState(null);
  const [paginationDirection, setPaginationDirection] = useState('next');
  const formRef = useRef(null);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const projectTermPlural = getProjectTermForIndustry(accountIndustry);
  const projectTermSingular = getProjectTermSingular(projectTermPlural);
  const projectTermSingularLower = (projectTermSingular || 'project').toLowerCase();
  const clientTermPluralLower = (getTermForIndustry(accountIndustry, 'client') || 'clients').toLowerCase();

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

  useEffect(() => {
    if (!orgReady || !currentUser?.uid) return;
    fetch('/api/get-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        organizationId: organization?.id ?? undefined,
      }),
    })
      .then((res) => res.ok ? res.json() : { projects: [] })
      .then((data) => setIds((data.projects || []).map((p) => p.id)))
      .catch(() => setIds([]));
  }, [orgReady, currentUser?.uid, organization?.id]);

  const currentIndex = projectId ? ids.indexOf(projectId) : -1;
  const prevId = currentIndex > 0 ? ids[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null;
  const editPath = (id) => `/dashboard/projects/${id}/edit`;

  const handleSaveAndGoToPagination = useCallback(() => {
    if (paginationTargetId) {
      setPendingNavigateToId(paginationTargetId);
      setPaginationDialogOpen(false);
      setPaginationTargetId(null);
      if (formRef.current && typeof formRef.current.requestSubmit === 'function') {
        formRef.current.requestSubmit();
      }
    }
  }, [paginationTargetId]);

  const handleDiscardAndGoToPagination = useCallback(() => {
    if (paginationTargetId) {
      setPaginationDialogOpen(false);
      setPaginationTargetId(null);
      router.push(editPath(paginationTargetId));
    }
  }, [paginationTargetId, router]);

  const openPaginationDialog = (direction, targetId) => {
    setPaginationDirection(direction);
    setPaginationTargetId(targetId);
    setPaginationDialogOpen(true);
  };

  const goToPrev = () => {
    if (!prevId) return;
    if (formHasChanges) openPaginationDialog('previous', prevId);
    else router.push(editPath(prevId));
  };

  const goToNext = () => {
    if (!nextId) return;
    if (formHasChanges) openPaginationDialog('next', nextId);
    else router.push(editPath(nextId));
  };

  const backUrl = '/dashboard/projects';
  const handleSuccess = useCallback(() => {
    if (pendingNavigateToId) {
      router.push(editPath(pendingNavigateToId));
      setPendingNavigateToId(null);
    } else {
      router.push(backUrl);
    }
  }, [pendingNavigateToId, router]);

  if (!currentUser?.uid || !projectId) return null;

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
            title={projectTermPlural || 'Projects'}
            description={`${projectTermPlural || 'Projects'} for your ${clientTermPluralLower}.`}
            actions={
              <Link href={backUrl}>
                <SecondaryButton type="button" className="gap-2">
                  <HiArrowLeft className="w-5 h-5" />
                  Back to {projectTermPlural?.toLowerCase() || 'projects'}
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
                Back to {projectTermPlural?.toLowerCase() || 'projects'}
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
            <div className="flex items-center gap-2">
              <Link href={backUrl}>
                <SecondaryButton type="button" className="gap-2">
                  <HiArrowLeft className="w-5 h-5" />
                  Back to {projectTermPlural?.toLowerCase() || 'projects'}
                </SecondaryButton>
              </Link>
              <div className="flex items-center border-l-2 border-primary-900/10 dark:border-primary-300/30 h-6 -ps-2"/>
              <IconButton onClick={goToPrev} disabled={!prevId} aria-label={`Previous ${projectTermSingularLower}`} title={`Previous ${projectTermSingularLower}`}>
                <HiChevronLeft className="w-5 h-5" />
              </IconButton>
              <IconButton onClick={goToNext} disabled={!nextId} aria-label={`Next ${projectTermSingularLower}`} title={`Next ${projectTermSingularLower}`}>
                <HiChevronRight className="w-5 h-5" />
              </IconButton>
            </div>
          }
        />
        <UnsavedChangesPaginationDialog
          isOpen={paginationDialogOpen}
          onClose={() => { setPaginationDialogOpen(false); setPaginationTargetId(null); }}
          onSaveAndGo={handleSaveAndGoToPagination}
          onDiscardAndGo={handleDiscardAndGoToPagination}
          direction={paginationDirection}
          itemNameSingular={projectTermSingularLower}
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <ClientProjectForm
            ref={formRef}
            initial={project}
            clientId={project.client_id}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            projectId={projectId}
            industry={accountIndustry}
            showClientDropdown={true}
            onSuccess={handleSuccess}
            onCancel={() => router.push(backUrl)}
            onHasChangesChange={setFormHasChanges}
          />
        </div>
      </div>
    </>
  );
}
