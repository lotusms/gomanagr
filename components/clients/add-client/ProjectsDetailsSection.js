import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { HiPlus, HiFolder, HiCheckCircle } from 'react-icons/hi';
import { PrimaryButton } from '@/components/ui/buttons';
import EmptyStateCard from './EmptyStateCard';
import ProjectLogCards from './ProjectLogCards';
import { ConfirmationDialog } from '@/components/ui';
import SideNavViewerLayout from './SideNavViewerLayout';
import { getProjectTermForIndustry, getProjectTermSingular } from '../clientProfileConstants';

const ACTIVE_STATUSES = ['planning', 'active', 'on_hold'];
const COMPLETED_STATUSES = ['completed', 'cancelled'];

const ACTIVE_BORDER = 'border-l-blue-500 dark:border-l-blue-400';
const COMPLETED_BORDER = 'border-l-green-500 dark:border-l-green-400';

const ACTIVE_BADGE = 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
const COMPLETED_BADGE = 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';

/**
 * Projects Details tab: same layout as Communication Log and Documents & Files.
 * Left nav (Active / Completed), right viewer with header, "+ Add", and card grid.
 */
export default function ProjectsDetailsSection({
  clientId,
  userId,
  organizationId,
  companyIndustry,
}) {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState('active');
  const [projectToDelete, setProjectToDelete] = useState(null);

  const projectTermPlural = useMemo(() => getProjectTermForIndustry(companyIndustry), [companyIndustry]);
  const projectTerm = useMemo(() => getProjectTermSingular(projectTermPlural), [projectTermPlural]);
  const projectTermLower = projectTerm.toLowerCase();
  const projectTermPluralLower = projectTermPlural.toLowerCase();

  const projectTypes = useMemo(
    () => [
      {
        key: 'active',
        label: `Active ${projectTermPlural}`,
        description: `Current ${projectTermPluralLower} in progress`,
        icon: HiFolder,
        borderClass: ACTIVE_BORDER,
        badgeClass: ACTIVE_BADGE,
      },
      {
        key: 'completed',
        label: `Completed ${projectTermPlural}`,
        description: `Previously completed ${projectTermPluralLower}`,
        icon: HiCheckCircle,
        borderClass: COMPLETED_BORDER,
        badgeClass: COMPLETED_BADGE,
      },
    ],
    [projectTermPlural, projectTermPluralLower]
  );

  const navItems = useMemo(
    () =>
      projectTypes.map((t) => ({
        key: t.key,
        label: t.label,
        icon: t.icon,
        badgeClass: t.badgeClass,
        count: null,
      })),
    [projectTypes]
  );

  useEffect(() => {
    if (!userId || !clientId) return;
    setLoading(true);
    fetch('/api/get-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        clientId,
        organizationId: organizationId || undefined,
      }),
    })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [userId, clientId, organizationId]);

  const activeProjects = useMemo(
    () => projects.filter((p) => ACTIVE_STATUSES.includes(p.status)),
    [projects]
  );
  const completedProjects = useMemo(
    () => projects.filter((p) => COMPLETED_STATUSES.includes(p.status)),
    [projects]
  );

  const selectedType = projectTypes.find((t) => t.key === selectedKey);
  const viewerHeader = selectedType
    ? {
        icon: selectedType.icon,
        title: selectedType.label,
        description: selectedType.description,
        badgeClass: selectedType.badgeClass,
      }
    : null;

  const filteredProjects = selectedKey === 'active' ? activeProjects : completedProjects;
  const hasEntriesInSelectedSection = filteredProjects.length > 0;

  const newProjectUrl = `/dashboard/clients/${clientId}/projects/new?status=${selectedKey}`;
  const editProjectUrl = (projectId) => `/dashboard/clients/${clientId}/projects/${projectId}/edit`;

  const handleAddInHeader = () => {
    router.push(newProjectUrl);
  };

  const handleEditProject = (id) => {
    router.push(editProjectUrl(id));
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete || !userId) return;
    try {
      const res = await fetch('/api/delete-client-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          projectId: projectToDelete,
          organizationId: organizationId || undefined,
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

  if (!userId || !clientId) return null;

  const renderViewerContent = () => {
    if (loading && projects.length === 0) {
      return <EmptyStateCard message="Loading projects…" />;
    }
    if (filteredProjects.length === 0) {
      const emptyLabel =
        selectedKey === 'active'
          ? `No active ${projectTermPluralLower}`
          : `No completed ${projectTermPluralLower}`;
      return (
        <EmptyStateCard
          message={emptyLabel}
          action={
            <PrimaryButton type="button" onClick={handleAddInHeader} className="gap-2">
              <HiPlus className="w-5 h-5" />
              Add {selectedKey === 'active' ? 'active' : 'completed'} {projectTermLower}
            </PrimaryButton>
          }
        />
      );
    }
    return (
      <ProjectLogCards
        projects={filteredProjects}
        onSelect={handleEditProject}
        onDelete={setProjectToDelete}
        borderClass={selectedType?.borderClass ?? ACTIVE_BORDER}
      />
    );
  };

  return (
    <>
      <SideNavViewerLayout
        introText={`Track active and completed ${projectTermPluralLower} for this client.`}
        navAriaLabel="Project sections"
        navItems={navItems}
        selectedKey={selectedKey}
        onSelectKey={setSelectedKey}
        viewerHeader={viewerHeader}
        viewerHeaderAction={
          hasEntriesInSelectedSection ? (
            <PrimaryButton type="button" onClick={handleAddInHeader} className="gap-2 flex-shrink-0">
              <HiPlus className="w-5 h-5" />
              Add
            </PrimaryButton>
          ) : null
        }
      >
        {renderViewerContent()}
      </SideNavViewerLayout>

      <ConfirmationDialog
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${projectTermLower}`}
        message={`This ${projectTermLower} will be permanently deleted. This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}
