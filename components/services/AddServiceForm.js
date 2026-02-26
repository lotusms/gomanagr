import { useState, useEffect } from 'react';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { InputField, TextareaField } from '@/components/ui';
import { ChipsMulti } from '@/components/ui/Chips';
import Avatar from '@/components/ui/Avatar';

/**
 * Normalize a service name for comparison (remove spaces, lowercase, trim)
 * @param {string} name - Service name to normalize
 * @returns {string} Normalized name
 */
function normalizeServiceName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\s/g, ''); // Remove all spaces
}

/**
 * Check if a service name is similar to existing services
 * @param {string} newName - New service name to check
 * @param {Array} existingServices - Array of existing service objects
 * @param {string} excludeId - Service ID to exclude from check (when editing)
 * @returns {Object} { isDuplicate: boolean, similarService: Object|null }
 */
function checkDuplicateService(newName, existingServices, excludeId = null) {
  const normalizedNewName = normalizeServiceName(newName);
  
  for (const service of existingServices) {
    if (excludeId && service.id === excludeId) continue;
    
    const normalizedExistingName = normalizeServiceName(service.name || '');
    
    if (normalizedNewName === normalizedExistingName) {
      return {
        isDuplicate: true,
        similarService: service,
      };
    }
  }
  
  return {
    isDuplicate: false,
    similarService: null,
  };
}

/**
 * Add Service Form Component
 * @param {Object} props
 * @param {Array} props.teamMembers - Array of team members
 * @param {Array} props.existingServices - Array of existing services to check for duplicates
 * @param {Object} props.initialService - Existing service to edit (optional)
 * @param {Function} props.onSubmit - Callback when form is submitted
 * @param {Function} props.onCancel - Callback when form is cancelled
 * @param {boolean} props.saving - Whether form is saving
 * @param {Array} props.preselectedTeamMemberIds - Team member IDs to preselect when creating a new service
 */
export default function AddServiceForm({
  teamMembers = [],
  existingServices = [],
  initialService = null,
  onSubmit,
  onCancel,
  saving = false,
  preselectedTeamMemberIds = [],
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTeamMemberIds, setAssignedTeamMemberIds] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialService) {
      setName(initialService.name || '');
      setDescription(initialService.description || '');
      const assignedIds = Array.isArray(initialService.assignedTeamMemberIds) 
        ? initialService.assignedTeamMemberIds.filter(id => id != null && id !== '')
        : [];
      setAssignedTeamMemberIds(assignedIds);
    } else {
      setName('');
      setDescription('');
      const preselectedIds = Array.isArray(preselectedTeamMemberIds) && preselectedTeamMemberIds.length > 0
        ? preselectedTeamMemberIds.filter(id => id != null && id !== '')
        : [];
      setAssignedTeamMemberIds(preselectedIds);
    }
    setErrors({});
  }, [initialService?.id, JSON.stringify(preselectedTeamMemberIds)]); // Use JSON.stringify for array comparison

  const sortedTeamMembers = [...teamMembers].sort((a, b) => {
    const aIsAdmin = a.isAdmin === true;
    const bIsAdmin = b.isAdmin === true;
    if (aIsAdmin && !bIsAdmin) return -1;
    if (!aIsAdmin && bIsAdmin) return 1;
    
    const nameA = (a.name || 'Unnamed').toLowerCase();
    const nameB = (b.name || 'Unnamed').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const teamMemberOptions = sortedTeamMembers.map((member) => member.id).filter(Boolean);
  
  const optionData = sortedTeamMembers.reduce((acc, member) => {
    if (member.id) {
      acc[member.id] = {
        avatar: member.pictureUrl,
        name: member.name || 'Unnamed',
      };
    }
    return acc;
  }, {});

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent submit from bubbling to parent form (e.g. add/edit team member form when this form is in a portaled drawer)
    const newErrors = {};

    if (!name || name.trim() === '') {
      newErrors.name = 'Please enter a service name';
    } else {
      const trimmedName = name.trim();
      const duplicateCheck = checkDuplicateService(
        trimmedName,
        existingServices,
        initialService?.id
      );
      
      if (duplicateCheck.isDuplicate) {
        newErrors.name = `A service named "${duplicateCheck.similarService.name}" already exists. Please use a different name.`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const serviceData = {
      id: initialService?.id || `svc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: name.trim(),
      description: description.trim() || undefined,
      assignedTeamMemberIds: Array.isArray(assignedTeamMemberIds) 
        ? assignedTeamMemberIds.filter(id => id != null && id !== '')
        : [],
    };

    onSubmit(serviceData);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(e);
      }}
      className="space-y-6 p-6"
    >
      <div>
        <InputField
          id="name"
          type="text"
          label="Service Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) {
              setErrors((prev) => ({ ...prev, name: '' }));
            }
          }}
          onBlur={() => {
            if (name && name.trim()) {
              const duplicateCheck = checkDuplicateService(
                name.trim(),
                existingServices,
                initialService?.id
              );
              if (duplicateCheck.isDuplicate) {
                setErrors((prev) => ({
                  ...prev,
                  name: `A service named "${duplicateCheck.similarService.name}" already exists. Please use a different name.`,
                }));
              }
            }
          }}
          placeholder="e.g., Haircut, Consultation, Massage"
          required
          error={errors.name}
          variant="light"
          autoFocus
        />
      </div>

      <div>
        <TextareaField
          id="description"
          label="Description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setErrors((prev) => ({ ...prev, description: '' }));
          }}
          placeholder="Service description..."
          rows={3}
          error={errors.description}
          variant="light"
        />
      </div>

      {teamMemberOptions.length > 0 ? (
        <div>
          <ChipsMulti
            id="assignedTeamMembers"
            label="Assign to Team Members"
            options={teamMemberOptions}
            value={Array.isArray(assignedTeamMemberIds) ? assignedTeamMemberIds : []}
            onValueChange={(selectedIds) => {
              setAssignedTeamMemberIds(Array.isArray(selectedIds) ? selectedIds : []);
            }}
            variant="light"
            layout="flex"
            optionData={optionData}
            renderOption={(optionId, isSelected, data) => (
              <div className="flex items-center justify-between gap-1.5 flex-1 min-w-0">
                <div className="flex items-center flex-1 min-w-0">
                  <Avatar 
                    src={data.avatar} 
                    name={data.name || 'Unnamed'} 
                    size="sm"
                    className="mr-2 -ml-2"
                  />
                  <span className="truncate">{data.name || 'Unnamed'}</span>
                </div>
                {isSelected && <span className="text-sm flex-shrink-0">✓</span>}
              </div>
            )}
          />
        </div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Add team members in the Team section to assign services.
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <div></div>
        <div className="flex justify-end gap-3">
          <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(e);
            }}
            disabled={saving}
          >
            {saving ? 'Saving...' : initialService ? 'Update Service' : 'Add Service'}
          </PrimaryButton>
        </div>
      </div>
    </form>
  );
}
