import { HiPlus, HiTrash } from 'react-icons/hi';
import InputField from '@/components/ui/InputField';
import ProjectCard from '../../dashboard/ProjectCard';
import { getLabelClasses } from '@/components/ui/formControlStyles';

export default function ProjectsDetailsSection({
  activeProjects,
  completedProjects,
  legalCaseNumber,
  linkedFiles,
  deliverables,
  approvals,
  defaultCurrency,
  expandedProjectKey,
  onActiveProjectsChange,
  onCompletedProjectsChange,
  onLegalCaseNumberChange,
  onLinkedFilesChange,
  onDeliverablesChange,
  onApprovalsChange,
  onExpandedProjectKeyChange,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Active Projects</h3>
        {activeProjects.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No active projects</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {activeProjects.map((project, idx) => (
              <ProjectCard
                key={`active-${idx}`}
                project={project}
                index={idx}
                variant="active"
                currency={defaultCurrency || 'USD'}
                expanded={expandedProjectKey === `active-${idx}`}
                onToggleExpand={() => onExpandedProjectKeyChange((k) => (k === `active-${idx}` ? null : `active-${idx}`))}
                onUpdate={(i, updated) => {
                  const next = [...activeProjects];
                  next[i] = updated;
                  onActiveProjectsChange(next);
                }}
                onRemove={(i) => {
                  onActiveProjectsChange(activeProjects.filter((_, index) => index !== i));
                  onExpandedProjectKeyChange(null);
                }}
              />
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => onActiveProjectsChange([...activeProjects, { name: '', id: '', notes: '', estimate: '', address: '', invoices: '' }])}
          className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
        >
          <HiPlus className="w-4 h-4" />
          Add Active Project
        </button>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Completed/Previous Projects</h3>
        {completedProjects.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No completed projects</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {completedProjects.map((project, idx) => (
              <ProjectCard
                key={`completed-${idx}`}
                project={project}
                index={idx}
                variant="completed"
                currency={defaultCurrency || 'USD'}
                expanded={expandedProjectKey === `completed-${idx}`}
                onToggleExpand={() => onExpandedProjectKeyChange((k) => (k === `completed-${idx}` ? null : `completed-${idx}`))}
                onUpdate={(i, updated) => {
                  const next = [...completedProjects];
                  next[i] = updated;
                  onCompletedProjectsChange(next);
                }}
                onRemove={(i) => {
                  onCompletedProjectsChange(completedProjects.filter((_, index) => index !== i));
                  onExpandedProjectKeyChange(null);
                }}
              />
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => onCompletedProjectsChange([...completedProjects, { name: '', id: '', notes: '', estimate: '', address: '', invoices: '' }])}
          className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
        >
          <HiPlus className="w-4 h-4" />
          Add Completed Project
        </button>
      </div>
      
      <InputField
        id="legalCaseNumber"
        label="Legal Case Number"
        value={legalCaseNumber}
        onChange={onLegalCaseNumberChange}
        variant="light"
      />
      
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Linked Files</label>
        <div className="space-y-2">
          {linkedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <InputField
                id={`linked-file-${idx}`}
                value={file}
                onChange={(e) => {
                  const updated = [...linkedFiles];
                  updated[idx] = e.target.value;
                  onLinkedFilesChange(updated);
                }}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onLinkedFilesChange(linkedFiles.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onLinkedFilesChange([...linkedFiles, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Linked File
          </button>
        </div>
      </div>
      
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Deliverables</label>
        <div className="space-y-2">
          {deliverables.map((deliverable, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <InputField
                id={`deliverable-${idx}`}
                value={deliverable}
                onChange={(e) => {
                  const updated = [...deliverables];
                  updated[idx] = e.target.value;
                  onDeliverablesChange(updated);
                }}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onDeliverablesChange(deliverables.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onDeliverablesChange([...deliverables, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Deliverable
          </button>
        </div>
      </div>
      
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Approvals</label>
        <div className="space-y-2">
          {approvals.map((approval, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <InputField
                id={`approval-${idx}`}
                value={approval}
                onChange={(e) => {
                  const updated = [...approvals];
                  updated[idx] = e.target.value;
                  onApprovalsChange(updated);
                }}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onApprovalsChange(approvals.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onApprovalsChange([...approvals, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Approval
          </button>
        </div>
      </div>
    </div>
  );
}
