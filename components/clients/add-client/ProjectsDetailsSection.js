import { useState, useMemo } from 'react';
import { HiPlus, HiTrash, HiFolder, HiCheckCircle, HiPaperClip, HiGift, HiShieldCheck } from 'react-icons/hi';
import InputField from '@/components/ui/InputField';
import ProjectCard from '../../dashboard/ProjectCard';
import { getLabelClasses } from '@/components/ui/formControlStyles';
import { PrimaryButton } from '@/components/ui/buttons';
import Drawer from '@/components/ui/Drawer';
import AddProjectForm from './AddProjectForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateClients } from '@/services/userService';
import { useToast } from '@/components/ui/Toast';
import { getProjectTermForIndustry, getProjectTermSingular } from '../clientProfileConstants';

/**
 * Reusable project section component (Active/Completed Projects)
 */
function ProjectSection({
  title,
  description,
  icon: Icon,
  iconBgColor,
  iconColor,
  projects,
  variant,
  defaultCurrency,
  expandedProjectKey,
  onProjectsChange,
  onExpandedProjectKeyChange,
  emptyMessage,
  emptyDescription,
  addButtonText,
  onAddProject, // Callback to open add project form
  onDeleteProject, // Callback to delete project (variant, index)
}) {
  const projectKeyPrefix = variant === 'active' ? 'active' : 'completed';
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${iconBgColor} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
        <PrimaryButton
          onClick={onAddProject}
        >
          <HiPlus className="w-4 h-4" />
          {addButtonText}
        </PrimaryButton>
      </div>
      
      {projects.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <Icon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{emptyMessage}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{emptyDescription}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, idx) => (
            <ProjectCard
              key={`${projectKeyPrefix}-${idx}`}
              project={project}
              index={idx}
              variant={variant}
              currency={defaultCurrency || 'USD'}
              expanded={expandedProjectKey === `${projectKeyPrefix}-${idx}`}
              onToggleExpand={() => onExpandedProjectKeyChange((k) => (k === `${projectKeyPrefix}-${idx}` ? null : `${projectKeyPrefix}-${idx}`))}
              onUpdate={(i, updated) => {
                const next = [...projects];
                next[i] = updated;
                onProjectsChange(next);
              }}
              onRemove={(i) => onDeleteProject(variant, i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Reusable list item component for Linked Files, Deliverables, and Approvals
 */
function ListItemCard({ id, value, onChange, onRemove, placeholder, icon: Icon, index }) {
  return (
    <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <InputField
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            variant="light"
            className="mb-0"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Remove"
        >
          <HiTrash className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Reusable section for list-based items (Linked Files, Deliverables, Approvals)
 */
function ListSection({ 
  title, 
  items, 
  onAdd, 
  onChange, 
  onRemove, 
  placeholder, 
  icon: Icon,
  emptyMessage,
  emptyDescription 
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={`${getLabelClasses('light')} mb-0 flex items-center gap-2`}>
          {Icon && <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
          {title}
        </label>
        <PrimaryButton
          onClick={onAdd}
        >
          <HiPlus className="w-4 h-4" />
          Add {title}
        </PrimaryButton>
      </div>
      
      {items.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <Icon className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{emptyMessage}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{emptyDescription}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <ListItemCard
              key={idx}
              id={`${title.toLowerCase().replace(/\s+/g, '-')}-${idx}`}
              value={item}
              onChange={(e) => {
                const updated = [...items];
                updated[idx] = e.target.value;
                onChange(updated);
              }}
              onRemove={() => onRemove(items.filter((_, i) => i !== idx))}
              placeholder={placeholder}
              icon={Icon}
              index={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsDetailsSection({
  activeProjects,
  completedProjects,
  linkedFiles,
  deliverables,
  approvals,
  defaultCurrency,
  expandedProjectKey,
  onActiveProjectsChange,
  onCompletedProjectsChange,
  onLinkedFilesChange,
  onDeliverablesChange,
  onApprovalsChange,
  onExpandedProjectKeyChange,
  clientId,
  onRefresh, // Callback to refresh data after saving
  companyIndustry, // Industry to determine dynamic project term
}) {
  const { currentUser } = useAuth();
  const { success, error: showError } = useToast();
  const [showAddProjectDrawer, setShowAddProjectDrawer] = useState(false);
  const [addingProjectVariant, setAddingProjectVariant] = useState(null); // 'active' or 'completed'
  const [savingProject, setSavingProject] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null); // { variant: 'active'|'completed', index: number }

  // Get dynamic project term based on industry
  const projectTermPlural = useMemo(() => getProjectTermForIndustry(companyIndustry), [companyIndustry]);
  const projectTerm = useMemo(() => getProjectTermSingular(projectTermPlural), [projectTermPlural]);
  const projectTermLower = projectTerm.toLowerCase();
  const projectTermPluralLower = projectTermPlural.toLowerCase();

  const handleAddProject = (variant) => {
    setAddingProjectVariant(variant);
    setShowAddProjectDrawer(true);
  };

  const handleProjectSubmit = async (projectData) => {
    if (!currentUser?.uid || !clientId) {
      throw new Error('User or client information missing');
    }

    setSavingProject(true);
    try {
      // Get current user account data
      const account = await getUserAccount(currentUser.uid);
      const clients = account?.clients || [];
      
      // Find the client to update
      const clientIndex = clients.findIndex((c) => c.id === clientId);
      if (clientIndex === -1) {
        throw new Error('Client not found');
      }

      const client = clients[clientIndex];
      const projectArray = addingProjectVariant === 'active' 
        ? (client.activeProjects || [])
        : (client.completedProjects || []);

      // Add the new project
      const updatedProjects = [...projectArray, projectData];
      
      // Update the client
      const updatedClient = {
        ...client,
        [addingProjectVariant === 'active' ? 'activeProjects' : 'completedProjects']: updatedProjects,
      };

      // Update clients array
      const updatedClients = [...clients];
      updatedClients[clientIndex] = updatedClient;

      // Save to Supabase
      await updateClients(currentUser.uid, updatedClients);

      // Update local state
      if (addingProjectVariant === 'active') {
        onActiveProjectsChange(updatedProjects);
      } else {
        onCompletedProjectsChange(updatedProjects);
      }

      success(`${projectTerm} added successfully`);
      setShowAddProjectDrawer(false);
      setAddingProjectVariant(null);

      // Refresh parent data if callback provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    } finally {
      setSavingProject(false);
    }
  };

  const handleCancelAddProject = () => {
    setShowAddProjectDrawer(false);
    setAddingProjectVariant(null);
  };

  const handleDeleteProject = (variant, index) => {
    setProjectToDelete({ variant, index });
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!currentUser?.uid || !clientId || !projectToDelete) {
      showError('Missing information to delete project');
      setShowDeleteDialog(false);
      setProjectToDelete(null);
      return;
    }

    setDeletingProject(true);
    try {
      // Get current user account data
      const account = await getUserAccount(currentUser.uid);
      const clients = account?.clients || [];
      
      // Find the client to update
      const clientIndex = clients.findIndex((c) => c.id === clientId);
      if (clientIndex === -1) {
        throw new Error('Client not found');
      }

      const client = clients[clientIndex];
      const projectArray = projectToDelete.variant === 'active' 
        ? (client.activeProjects || [])
        : (client.completedProjects || []);

      // Remove the project
      const updatedProjects = projectArray.filter((_, idx) => idx !== projectToDelete.index);
      
      // Update the client
      const updatedClient = {
        ...client,
        [projectToDelete.variant === 'active' ? 'activeProjects' : 'completedProjects']: updatedProjects,
      };

      // Update clients array
      const updatedClients = [...clients];
      updatedClients[clientIndex] = updatedClient;

      // Save to Supabase
      await updateClients(currentUser.uid, updatedClients);

      // Update local state
      if (projectToDelete.variant === 'active') {
        onActiveProjectsChange(updatedProjects);
      } else {
        onCompletedProjectsChange(updatedProjects);
      }

      // Close any expanded project
      onExpandedProjectKeyChange(null);

      success(`${projectTerm} deleted successfully`);
      setShowDeleteDialog(false);
      setProjectToDelete(null);

      // Refresh parent data if callback provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      showError(error.message || `Failed to delete ${projectTermLower}. Please try again.`);
    } finally {
      setDeletingProject(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setProjectToDelete(null);
  };

  return (
    <>
      <div className="space-y-8">
        {/* Active Projects Section */}
        <ProjectSection
          title={`Active ${projectTermPlural}`}
          description={`Current ${projectTermLower} in progress`}
          icon={HiFolder}
          iconBgColor="bg-blue-50 dark:bg-blue-900/20"
          iconColor="text-blue-600 dark:text-blue-400"
          projects={activeProjects}
          variant="active"
          defaultCurrency={defaultCurrency}
          expandedProjectKey={expandedProjectKey}
          onProjectsChange={onActiveProjectsChange}
          onExpandedProjectKeyChange={onExpandedProjectKeyChange}
          emptyMessage={`No active ${projectTermPluralLower}`}
          emptyDescription={`Add your first active ${projectTermLower} to get started`}
          addButtonText={`Add Active ${projectTerm}`}
          onAddProject={() => handleAddProject('active')}
          onDeleteProject={handleDeleteProject}
        />
        
        {/* Completed Projects Section */}
        <ProjectSection
          title={`Completed ${projectTermPlural}`}
          description={`Previously completed ${projectTermLower}`}
          icon={HiCheckCircle}
          iconBgColor="bg-green-50 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
          projects={completedProjects}
          variant="completed"
          defaultCurrency={defaultCurrency}
          expandedProjectKey={expandedProjectKey}
          onProjectsChange={onCompletedProjectsChange}
          onExpandedProjectKeyChange={onExpandedProjectKeyChange}
          emptyMessage={`No completed ${projectTermPluralLower}`}
          emptyDescription={`Completed ${projectTermPluralLower} will appear here`}
          addButtonText={`Add Completed ${projectTerm}`}
          onAddProject={() => handleAddProject('completed')}
          onDeleteProject={handleDeleteProject}
        />
        
        {/* Linked Files, Deliverables, and Approvals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ListSection
          title="Linked Files"
          items={linkedFiles}
          onAdd={() => onLinkedFilesChange([...linkedFiles, ''])}
          onChange={onLinkedFilesChange}
          onRemove={onLinkedFilesChange}
          placeholder="File name or URL"
          icon={HiPaperClip}
          emptyMessage="No linked files"
          emptyDescription={`Add files related to this ${projectTermLower}`}
        />
        
        <ListSection
          title="Deliverables"
          items={deliverables}
          onAdd={() => onDeliverablesChange([...deliverables, ''])}
          onChange={onDeliverablesChange}
          onRemove={onDeliverablesChange}
          placeholder="Deliverable name"
          icon={HiGift}
          emptyMessage="No deliverables"
          emptyDescription={`Add ${projectTermLower} deliverables`}
        />
        
        <ListSection
          title="Approvals"
          items={approvals}
          onAdd={() => onApprovalsChange([...approvals, ''])}
          onChange={onApprovalsChange}
          onRemove={onApprovalsChange}
          placeholder="Approval name or reference"
          icon={HiShieldCheck}
          emptyMessage="No approvals"
          emptyDescription="Add required approvals"
        />
        </div>
      </div>

      {/* Add Project Drawer */}
      {showAddProjectDrawer && (
        <Drawer
          isOpen={showAddProjectDrawer}
          onClose={handleCancelAddProject}
          title={addingProjectVariant === 'active' ? `Add Active ${projectTerm}` : `Add Completed ${projectTerm}`}
        >
          <AddProjectForm
            currency={defaultCurrency || 'USD'}
            onSubmit={handleProjectSubmit}
            onCancel={handleCancelAddProject}
            loading={savingProject}
          />
        </Drawer>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={`Delete ${projectTerm}`}
        message={`Are you sure you want to delete this ${projectTermLower}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deletingProject}
      />
    </>
  );
}
