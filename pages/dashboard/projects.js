import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader, ConfirmationDialog, Paginator } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import ProjectsPageSkeleton from '@/components/dashboard/ProjectsPageSkeleton';
import EmptyStateCard from '@/components/clients/add-client/EmptyStateCard';
import ProjectCardServiceStyle from '@/components/dashboard/ProjectCardServiceStyle';
import { getProjectTermForIndustry, getProjectTermSingular } from '@/components/clients/clientProfileConstants';
import { HiPlus } from 'react-icons/hi';

function ProjectsContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return projects.slice(start, start + itemsPerPage);
  }, [projects, currentPage, itemsPerPage]);

  useEffect(() => {
    const totalPages = Math.ceil(projects.length / itemsPerPage);
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [projects.length, itemsPerPage, currentPage]);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const projectTermPlural = useMemo(() => getProjectTermForIndustry(userAccount?.industry), [userAccount?.industry]);
  const projectTermSingular = useMemo(() => getProjectTermSingular(projectTermPlural), [projectTermPlural]);
  const projectTermPluralLower = (projectTermPlural || 'Projects').toLowerCase();
  const projectTermSingularLower = (projectTermSingular || 'project').toLowerCase();

  useEffect(() => {
    if (!currentUser?.uid) return;
    setOrgResolved(false);
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgResolved(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((data) => setUserAccount(data || null))
      .catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !orgResolved) return;
    setLoading(true);
    const orgId = organization?.id ?? undefined;

    Promise.all([
      fetch('/api/get-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
      }).then((r) => r.json().then((d) => d.projects || [])),
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      }).then((r) => r.json().then((d) => d.clients || [])),
    ])
      .then(([projectsList, clientsList]) => {
        setProjects(projectsList);
        if (clientsList.length > 0) {
          setClients(clientsList);
        } else {
          getUserAccount(currentUser.uid).then((account) => {
            const fromAccount = Array.isArray(account?.clients) ? account.clients : [];
            setClients(fromAccount);
          }).catch(() => setClients([]));
        }
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [currentUser?.uid, orgResolved, organization?.id]);

  const clientNameByClientId = useMemo(() => {
    const map = {};
    clients.forEach((c) => {
      const name = (c.name || c.companyName || 'Unnamed client').trim();
      if (c.id) map[c.id] = name;
    });
    return map;
  }, [clients]);

  const handleDeleteConfirm = async () => {
    if (!projectToDelete || !currentUser?.uid) return;
    try {
      const res = await fetch('/api/delete-client-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          projectId: projectToDelete,
          organizationId: organization?.id ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete));
      setProjectToDelete(null);
    } catch (err) {
      console.error(err);
      setProjectToDelete(null);
    }
  };

  const title = projectTermPlural || 'Projects';

  if (loading) {
    return (
      <>
        <Head>
          <title>{title} - GoManagr</title>
        </Head>
        <ProjectsPageSkeleton />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{title} - GoManagr</title>
        <meta name="description" content={`Manage ${projectTermPluralLower}`} />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title={title}
          description={`${title} for your clients. Create and edit from here.`}
          actions={
            <PrimaryButton
              type="button"
              className="gap-2"
              onClick={() => router.push('/dashboard/projects/new')}
            >
              <HiPlus className="w-5 h-5" />
              Create {projectTermSingularLower}
            </PrimaryButton>
          }
        />

        {projects.length === 0 ? (
          <EmptyStateCard
            message={`No ${projectTermPluralLower} yet`}
            action={
              <PrimaryButton
                type="button"
                className="gap-2"
                onClick={() => router.push('/dashboard/projects/new')}
              >
                <HiPlus className="w-5 h-5" />
                Create your first {projectTermSingularLower}
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paginatedProjects.map((proj) => (
                <ProjectCardServiceStyle
                  key={proj.id}
                  project={proj}
                  onSelect={(id) => router.push(`/dashboard/projects/${id}/edit`)}
                  onDelete={setProjectToDelete}
                  clientNameByClientId={clientNameByClientId}
                />
              ))}
            </div>
            {projects.length > 6 && (
              <Paginator
                currentPage={currentPage}
                totalItems={projects.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[6, 12, 24, 48, 96]}
                showItemsPerPage={true}
                maxVisiblePages={5}
                showInfo={false}
                showFirstLast={false}
                className="mt-6"
              />
            )}
            <ConfirmationDialog
              isOpen={!!projectToDelete}
              onClose={() => setProjectToDelete(null)}
              onConfirm={handleDeleteConfirm}
              title={`Delete ${projectTermSingularLower}`}
              message={`This ${projectTermSingularLower} will be permanently deleted. This cannot be undone.`}
              confirmText="Delete"
              cancelText="Cancel"
              confirmationWord="delete"
              variant="danger"
            />
          </>
        )}
      </div>
    </>
  );
}

export default function ProjectsPage() {
  return <ProjectsContent />;
}
