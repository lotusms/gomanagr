import { useState, useCallback } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { useCancelWithConfirm } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';

/**
 * Form for adding/editing a project
 * @param {Object} props
 * @param {Object} props.initialProject - Existing project data (null for new)
 * @param {string} props.currency - Currency code for estimate field
 * @param {Function} props.onSubmit - (projectData) => Promise<void>
 * @param {Function} props.onCancel - () => void
 * @param {boolean} props.loading - Whether form is submitting
 */
export default function AddProjectForm({
  initialProject = null,
  currency = 'USD',
  onSubmit,
  onCancel,
  loading = false,
}) {
  const [name, setName] = useState(initialProject?.name || '');
  const [id, setId] = useState(initialProject?.id || '');
  const [notes, setNotes] = useState(initialProject?.notes || '');
  const [estimate, setEstimate] = useState(initialProject?.estimate || '');
  const [address, setAddress] = useState(initialProject?.address || '');
  const [invoices, setInvoices] = useState(initialProject?.invoices || '');
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const markDirty = useCallback(() => setHasChanges(true), []);
  const { handleCancel, discardDialog } = useCancelWithConfirm(onCancel, hasChanges);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Project name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const projectData = {
      name: name.trim(),
      id: id.trim() || undefined,
      notes: notes.trim() || undefined,
      estimate: estimate ? String(estimate).trim() : undefined,
      address: address.trim() || undefined,
      invoices: invoices.trim() || undefined,
    };

    try {
      await onSubmit(projectData);
    } catch (error) {
      console.error('Failed to save project:', error);
      setErrors({ submit: error.message || 'Failed to save project. Please try again.' });
    }
  };

  return (
    <form onSubmit={handleSubmit} onInput={markDirty} className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="project-name"
          label="Project Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => ({ ...prev, name: '' }));
          }}
          error={errors.name}
          required
          variant="light"
        />
        <InputField
          id="project-id"
          label="Project ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
          variant="light"
          placeholder="Optional"
        />
      </div>

      <TextareaField
        id="project-notes"
        label="Notes/Description"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        variant="light"
        placeholder="Add project notes or description..."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CurrencyInput
          id="project-estimate"
          label="Project Estimate"
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          currency={currency}
          placeholder="0.00"
          variant="light"
        />
        <InputField
          id="project-address"
          label="Project Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          variant="light"
          placeholder="Optional"
        />
      </div>

      <InputField
        id="project-invoices"
        label="Project Invoices"
        value={invoices}
        onChange={(e) => setInvoices(e.target.value)}
        variant="light"
        placeholder="Comma-separated invoice IDs"
      />

      {errors.submit && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <SecondaryButton type="button" onClick={handleCancel} disabled={loading}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? 'Saving...' : initialProject ? 'Update Project' : 'Add Project'}
        </PrimaryButton>
      </div>
      {discardDialog}
    </form>
  );
}
