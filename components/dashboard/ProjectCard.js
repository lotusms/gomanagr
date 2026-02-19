import { useState } from 'react';
import Link from 'next/link';
import { HiFolder, HiPencil, HiTrash, HiCurrencyDollar, HiLocationMarker, HiDocumentText, HiUser } from 'react-icons/hi';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { formatCurrency } from '@/utils/formatCurrency';

const defaultProject = { name: '', id: '', notes: '', estimate: '', address: '', invoices: '' };

/**
 * Project card matching the services card design.
 * Shows summary view with option to expand and edit.
 *
 * @param {Object} props
 * @param {Object} props.project - { name, id, notes, estimate, address, invoices }
 * @param {number} props.index - Index in the parent list
 * @param {Function} props.onUpdate - (index, updatedProject) => void
 * @param {Function} props.onRemove - (index) => void
 * @param {string} props.currency - Currency code for estimate (e.g. 'USD')
 * @param {boolean} props.expanded - Whether the card is in edit mode
 * @param {Function} props.onToggleExpand - () => void
 * @param {string} props.variant - 'active' | 'completed'
 * @param {boolean} props.readOnly - If true, no edit/remove; show View client if clientId set
 * @param {string} props.clientName - Client name for read-only view
 * @param {string} props.clientId - Client id for "View client" link
 */
export default function ProjectCard({
  project = defaultProject,
  index,
  onUpdate,
  onRemove,
  currency = 'USD',
  expanded = false,
  onToggleExpand,
  variant = 'active',
  readOnly = false,
  clientName,
  clientId,
}) {
  const [localProject, setLocalProject] = useState(project);

  const updateField = (field, value) => {
    const next = { ...localProject, [field]: value };
    setLocalProject(next);
    onUpdate(index, next);
  };

  const displayName = project.name?.trim() || 'Untitled Project';
  const displayId = project.id?.trim();
  const hasEstimate = project.estimate != null && String(project.estimate).trim() !== '';
  const hasAddress = project.address?.trim();
  const hasInvoices = project.invoices?.trim();

  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-600 transition-all duration-300 flex flex-col"
    >
      {/* Header - same style as services cards */}
      <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <HiFolder className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{displayName}</h3>
              {displayId && (
                <p className="text-sm text-white/80 truncate mt-0.5">ID: {displayId}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            {readOnly && clientId ? (
              <Link
                href={`/dashboard/clients/${clientId}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors text-sm font-medium"
                title="View client"
              >
                <HiUser className="size-4" />
                View client
              </Link>
            ) : !readOnly ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocalProject(project);
                    onToggleExpand();
                  }}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                  title={expanded ? 'Collapse' : 'Edit project'}
                >
                  <HiPencil className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                  title="Remove project"
                >
                  <HiTrash className="size-5" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-5 flex-1 flex flex-col">
        {(!expanded || readOnly) ? (
          <>
            {project.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 leading-relaxed">
                {project.notes}
              </p>
            )}
            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
              {hasEstimate && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <HiCurrencyDollar className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span>Estimate: {formatCurrency(project.estimate, currency)}</span>
                </div>
              )}
              {hasAddress && (
                <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <HiLocationMarker className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{project.address}</span>
                </div>
              )}
              {hasInvoices && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <HiDocumentText className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="truncate">{project.invoices}</span>
                </div>
              )}
              {readOnly && clientName && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 pt-2">
                  <HiUser className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span>{clientName}</span>
                </div>
              )}
              {!readOnly && !hasEstimate && !hasAddress && !hasInvoices && !project.notes && (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">No details yet — click Edit to add</p>
              )}
              {readOnly && !hasEstimate && !hasAddress && !hasInvoices && !project.notes && !clientName && (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">No details</p>
              )}
            </div>
          </>
        ) : !readOnly ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                id={`project-name-${variant}-${index}`}
                label="Project Name"
                value={localProject.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                variant="light"
              />
              <InputField
                id={`project-id-${variant}-${index}`}
                label="Project ID"
                value={localProject.id || ''}
                onChange={(e) => updateField('id', e.target.value)}
                variant="light"
              />
            </div>
            <TextareaField
              id={`project-notes-${variant}-${index}`}
              label="Notes/Description"
              value={localProject.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
              variant="light"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyInput
                id={`project-estimate-${variant}-${index}`}
                label="Project Estimate"
                value={localProject.estimate || ''}
                onChange={(e) => updateField('estimate', e.target.value)}
                currency={currency}
                placeholder="0.00"
                variant="light"
              />
              <InputField
                id={`project-address-${variant}-${index}`}
                label="Project Address"
                value={localProject.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
                variant="light"
              />
            </div>
            <InputField
              id={`project-invoices-${variant}-${index}`}
              label="Project Invoices"
              value={localProject.invoices || ''}
              onChange={(e) => updateField('invoices', e.target.value)}
              placeholder="Comma-separated invoice IDs"
              variant="light"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const defaultProjectShape = defaultProject;
