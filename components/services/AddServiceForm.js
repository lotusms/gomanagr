import { useState, useEffect, useCallback } from 'react';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { InputField, TextareaField, Dropdown, useCancelWithConfirm } from '@/components/ui';
import { ChipsMulti } from '@/components/ui/Chips';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Avatar from '@/components/ui/Avatar';
import { unformatCurrency } from '@/utils/formatCurrency';
import { getTermForIndustry } from '@/components/clients/clientProfileConstants';

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

const COST_TYPE_OPTIONS = [
  { value: 'one_time', label: 'One-time fee' },
  { value: 'per_hour', label: 'Per hour' },
  { value: 'daily', label: 'Daily' },
  { value: 'per_session', label: 'Per session' },
  { value: 'recurrent', label: 'Recurrent' },
];

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
 * @param {string} props.mode - 'page' = full form (Services page); 'drawer' = minimized (Team Member drawer). Default 'drawer'
 * @param {string} [props.userId] - For page mode: used to suggest next Service ID
 * @param {string} [props.organizationId] - For page mode: used to suggest next Service ID
 * @param {string} [props.defaultCurrency] - For cost amount (default 'USD')
 */
export default function AddServiceForm({
  teamMembers = [],
  existingServices = [],
  initialService = null,
  onSubmit,
  onCancel,
  saving = false,
  industry = null,
  preselectedTeamMemberIds = [],
  mode = 'drawer',
  userId,
  organizationId,
  defaultCurrency = 'USD',
}) {
  const isPageMode = mode === 'page';
  const assignReadOnly = !isPageMode;
  const teamMemberTerm = getTermForIndustry(industry, 'teamMember');
  const teamTerm = getTermForIndustry(industry, 'team');
  const assignToLabel = `Assign to ${teamMemberTerm}`;
  const emptyAssignCopy = `Add ${teamMemberTerm.toLowerCase()} in the ${teamTerm} section to assign services.`;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTeamMemberIds, setAssignedTeamMemberIds] = useState([]);
  const [serviceNumber, setServiceNumber] = useState('');
  const [serviceIdSuggested, setServiceIdSuggested] = useState(false);
  const [costType, setCostType] = useState('one_time');
  const [costAmount, setCostAmount] = useState('');
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const markDirty = useCallback(() => setHasChanges(true), []);
  const { handleCancel, discardDialog } = useCancelWithConfirm(onCancel, hasChanges);

  useEffect(() => {
    if (initialService) {
      setName(initialService.name || '');
      setDescription(initialService.description || '');
      const assignedIds = Array.isArray(initialService.assignedTeamMemberIds)
        ? initialService.assignedTeamMemberIds.filter((id) => id != null && id !== '')
        : [];
      setAssignedTeamMemberIds(assignedIds);
      setServiceNumber(initialService.service_number || '');
      setCostType(initialService.cost_type || 'one_time');
      setCostAmount(
        initialService.cost_amount != null && String(initialService.cost_amount).trim()
          ? unformatCurrency(String(initialService.cost_amount))
          : ''
      );
    } else {
      setName('');
      setDescription('');
      const preselectedIds =
        Array.isArray(preselectedTeamMemberIds) && preselectedTeamMemberIds.length > 0
          ? preselectedTeamMemberIds.filter((id) => id != null && id !== '')
          : [];
      setAssignedTeamMemberIds(preselectedIds);
      setServiceNumber('');
      setServiceIdSuggested(false);
      setCostType('one_time');
      setCostAmount('');
    }
    setErrors({});
    setHasChanges(false);
  }, [initialService?.id, JSON.stringify(preselectedTeamMemberIds)]);

  // Suggest next Service ID when creating new and we have userId + organizationId (page or drawer)
  useEffect(() => {
    if (initialService || !userId || !organizationId || serviceIdSuggested) return;
    fetch('/api/get-next-service-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        organizationId: organizationId || undefined,
        date: new Date().toISOString().slice(0, 10),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.suggestedId) {
          setServiceNumber(data.suggestedId);
          setServiceIdSuggested(true);
        }
      })
      .catch(() => {});
  }, [isPageMode, initialService, userId, organizationId, serviceIdSuggested]);

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
        ? assignedTeamMemberIds.filter((id) => id != null && id !== '')
        : [],
    };
    serviceData.service_number = serviceNumber.trim() || undefined;
    serviceData.cost_type = costType || undefined;
    serviceData.cost_amount = costAmount.trim() || undefined;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InputField
          id="name"
          type="text"
          label="Service name"
          value={name}
          onChange={(e) => {
            markDirty();
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
          }}
          onBlur={() => {
            if (name && name.trim()) {
              const duplicateCheck = checkDuplicateService(name.trim(), existingServices, initialService?.id);
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
        <InputField
          id="serviceNumber"
          type="text"
          label="Service ID"
          value={serviceNumber}
          onChange={(e) => { markDirty(); setServiceNumber(e.target.value); }}
          placeholder={initialService ? undefined : (isPageMode ? 'Auto-generated; editable for legacy IDs' : 'Optional')}
          variant="light"
        />
        <Dropdown
          id="costType"
          name="costType"
          label="Billing type"
          value={costType}
          onChange={(e) => { markDirty(); setCostType(e.target.value || 'one_time'); }}
          options={COST_TYPE_OPTIONS}
          placeholder="One-time fee"
          searchable={false}
        />
        <CurrencyInput
          id="costAmount"
          label={`Cost (${defaultCurrency})`}
          value={costAmount}
          onChange={(e) => { markDirty(); setCostAmount(e.target.value ?? ''); }}
          currency={defaultCurrency}
          variant="light"
          placeholder="0.00"
        />
      </div>

      <div>
        <TextareaField
          id="description"
          label="Description"
          value={description}
          onChange={(e) => {
            markDirty();
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
          {assignReadOnly ? (
            <>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {assignToLabel}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Assignments can only be changed from the Services page.
              </p>
              <ul className="space-y-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 p-3">
                {sortedTeamMembers.map((member) => {
                  const isAssigned = assignedTeamMemberIds.includes(member.id);
                  return (
                    <li
                      key={member.id}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                    >
                      <Avatar
                        src={member.pictureUrl}
                        name={member.name || 'Unnamed'}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <span className="flex-1 min-w-0 truncate">{member.name || 'Unnamed'}</span>
                      {isAssigned && (
                        <span className="flex-shrink-0 text-primary-600 dark:text-primary-400" aria-hidden>✓</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <ChipsMulti
              id="assignedTeamMembers"
              label={assignToLabel}
              options={teamMemberOptions}
              value={Array.isArray(assignedTeamMemberIds) ? assignedTeamMemberIds : []}
              onValueChange={(selectedIds) => {
                markDirty();
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
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {emptyAssignCopy}
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <div></div>
        <div className="flex justify-end gap-3">
          <SecondaryButton type="button" onClick={handleCancel} disabled={saving}>
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
      {discardDialog}
    </form>
  );
}
