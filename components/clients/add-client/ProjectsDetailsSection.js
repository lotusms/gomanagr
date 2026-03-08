import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { HiPlus, HiDocumentText, HiFolder, HiPause, HiStop, HiCheckCircle, HiBan } from 'react-icons/hi';
import { PrimaryButton } from '@/components/ui/buttons';
import EmptyStateCard from './EmptyStateCard';
import ProjectLogCards from './ProjectLogCards';
import { ConfirmationDialog } from '@/components/ui';
import SideNavViewerLayout from './SideNavViewerLayout';
import { getTermForIndustry, getTermSingular } from '../clientProfileConstants';

/** All project statuses; each maps to one tab. Draft first per request. */
const PROJECT_STATUS_TABS = [
  { key: 'draft', statuses: ['draft'], label: 'Draft', icon: HiDocumentText, borderClass: 'border-l-slate-500 dark:border-l-slate-400', badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200' },
  { key: 'active', statuses: ['active'], label: 'Active', icon: HiFolder, borderClass: 'border-l-blue-500 dark:border-l-blue-400', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  { key: 'on_hold', statuses: ['on_hold'], label: 'On hold', icon: HiPause, borderClass: 'border-l-amber-500 dark:border-l-amber-400', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  { key: 'inactive', statuses: ['inactive'], label: 'Inactive', icon: HiStop, borderClass: 'border-l-gray-500 dark:border-l-gray-400', badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200' },
  { key: 'completed', statuses: ['completed'], label: 'Completed', icon: HiCheckCircle, borderClass: 'border-l-green-500 dark:border-l-green-400', badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  { key: 'abandoned', statuses: ['abandoned'], label: 'Abandoned', icon: HiBan, borderClass: 'border-l-red-500 dark:border-l-red-400', badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
];

/**
 * Projects Details tab: same layout as Communication Log and Documents & Files.
 * Left nav (Draft, Active, On hold, Inactive, Completed, Abandoned), right viewer with header, "+ Add", and card grid.
 */
export default function ProjectsDetailsSection({
  clientId,
  userId,
  organizationId,
  companyIndustry,
  industry: accountIndustry,
}) {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState('draft');
  const [projectToDelete, setProjectToDelete] = useState(null);

  const projectTermPlural = useMemo(
    () => getTermForIndustry(accountIndustry ?? companyIndustry, 'project'),
    [accountIndustry, companyIndustry]
  );
  const projectTerm = useMemo(() => getTermSingular(projectTermPlural) || 'Project', [projectTermPlural]);
  const projectTermLower = projectTerm.toLowerCase();
  const projectTermPluralLower = projectTermPlural.toLowerCase();
  const clientTermSingular = getTermSingular(getTermForIndustry(accountIndustry ?? companyIndustry, 'client')) || 'Client';
  const clientTermSingularLower = clientTermSingular.toLowerCase();

  const projectTypes = useMemo(
    () =>
      PROJECT_STATUS_TABS.map((tab) => ({
        key: tab.key,
        label: tab.key === 'draft' 
          ? `Draft ${projectTermPlural}` : tab.key === 'active' 
          ? `Active ${projectTermPlural}` : tab.key === 'completed' ? `Completed ${projectTermPlural}` : tab.key === 'abandoned' ? `Abandoned ${projectTermPlural}` : `${tab.label} ${projectTermPlural}`,
        description: tab.key === 'draft' ? `${projectTermPlural} not yet started` : tab.key === 'active' ? `Current ${projectTermPluralLower} in progress` : tab.key === 'completed' ? `Finished ${projectTermPluralLower}` : tab.key === 'abandoned' ? `Cancelled or abandoned ${projectTermPluralLower}` : `${tab.label.toLowerCase()} ${projectTermPluralLower}`,
        icon: tab.icon,
        borderClass: tab.borderClass,
        badgeClass: tab.badgeClass,
        statuses: tab.statuses,
      })),
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

  const projectsByKey = useMemo(() => {
    const map = {};
    projectTypes.forEach((t) => {
      map[t.key] = projects.filter((p) => t.statuses.includes(p.status));
    });
    return map;
  }, [projects, projectTypes]);

  const selectedType = projectTypes.find((t) => t.key === selectedKey);
  const viewerHeader = selectedType
    ? {
        icon: selectedType.icon,
        title: selectedType.label,
        description: selectedType.description,
        badgeClass: selectedType.badgeClass,
      }
    : null;

  const filteredProjects = projectsByKey[selectedKey] ?? [];
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
      return <EmptyStateCard message={`Loading ${projectTermPluralLower}…`} />;
    }
    if (filteredProjects.length === 0) {
      const statusLabel = selectedType?.label?.replace(projectTermPlural, '').trim() || selectedKey;
      const emptyLabel = `No ${statusLabel.toLowerCase()} ${projectTermPluralLower}`;
      return (
        <EmptyStateCard
          message={emptyLabel}
          action={
            <PrimaryButton type="button" onClick={handleAddInHeader} className="gap-2">
              <HiPlus className="w-5 h-5" />
              Add {statusLabel.toLowerCase()} {projectTermLower}
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
        borderClass={selectedType?.borderClass ?? 'border-l-slate-500 dark:border-l-slate-400'}
        projectTermSingular={projectTerm}
      />
    );
  };

  return (
    <>
      <SideNavViewerLayout
        introText={`Track ${projectTermPluralLower} by status for this ${clientTermSingularLower}.`}
        navAriaLabel={`${projectTermPlural} sections`}
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
