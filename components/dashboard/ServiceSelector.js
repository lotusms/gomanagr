/**
 * Reusable service selector: dropdown to pick existing services + "Add" button that opens
 * a drawer with AddServiceForm to create a new service and persist it (via onServiceCreated).
 * Used in Add/Edit Team Member form (multiple selection) and Add/Edit Appointment form (single).
 *
 * @param {Array} services - Full service list (for create/duplicate check and onServiceCreated). Used as dropdown options when displayServices not provided.
 * @param {Array} [displayServices] - Optional filtered list for dropdown options only (e.g. services for selected staff). Defaults to services.
 * @param {Array<string>} value - Selected service IDs
 * @param {Function} onChange - (ids: string[]) => void
 * @param {Function} [onServiceCreated] - (updatedServices: Array) => Promise<void> | void — persist and refresh list (not used when onAddServiceLocally is provided)
 * @param {Function} [onAddServiceLocally] - (serviceData: object) => void — when provided (e.g. team member form), new services are added locally only and shown as chips; persist happens on member save
 * @param {Array} teamMembers - For AddServiceForm (assign to team members)
 * @param {boolean} multiple - If true, allow multiple selection and show chips; if false, single dropdown
 * @param {Array<string>} [preselectedTeamMemberIds] - Preselect these in Add Service form (e.g. current member when adding from team form)
 * @param {string} [label] - Label for the field (e.g. "Services offered", "Service")
 * @param {boolean} [disabled]
 * @param {string} [dropdownPlaceholder]
 * @param {string} [addButtonLabel] - Default "Add"
 * @param {string} [drawerTitle] - Default "Add Service"
 * @param {string} [drawerWidth] - Default "75vw"
 * @param {Function} [onNestedDrawerChange] - (open: boolean) => void — called when the Add Service drawer opens (true) or closes (false). Use so the parent drawer does not close on overlay click while this drawer is open.
 * @param {string} [chipsSectionLabel] - When multiple is true, optional label shown above the chips (e.g. "Assigned to this member"). Only used on team member form, not appointment.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { PrimaryButton } from '@/components/ui/buttons';
import { Dropdown, Drawer } from '@/components/ui';
import AddServiceForm from '@/components/services/AddServiceForm';
import { HiPlus } from 'react-icons/hi';

/** When multiple is true: id -> { id, name } for services just created so chips show name before parent updates services prop. */
function useRecentlyCreatedServices(services) {
  const ref = useRef({});
  useEffect(() => {
    const list = services || [];
    Object.keys(ref.current).forEach((id) => {
      if (list.some((s) => s.id === id)) delete ref.current[id];
    });
  }, [services]);
  return ref;
}

export default function ServiceSelector({
  services = [],
  displayServices,
  value = [],
  onChange,
  onServiceCreated,
  onAddServiceLocally,
  teamMembers = [],
  multiple = false,
  preselectedTeamMemberIds = [],
  label = 'Service',
  disabled = false,
  dropdownPlaceholder = 'Select a service...',
  addButtonLabel = 'Add',
  drawerTitle = 'Add Service',
  drawerWidth = '75vw',
  onNestedDrawerChange,
  /** When multiple: optional label shown above the chips (e.g. "Assigned to this member") */
  chipsSectionLabel,
}) {
  const [showServiceDrawer, setShowServiceDrawer] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const recentlyCreatedRef = useRecentlyCreatedServices(services);

  const NESTED_DRAWER_CLOSE_DELAY_MS = 400;

  const closeServiceDrawer = useCallback(() => {
    setShowServiceDrawer(false);
    if (onNestedDrawerChange) {
      setTimeout(() => onNestedDrawerChange(false), NESTED_DRAWER_CLOSE_DELAY_MS);
    }
  }, [onNestedDrawerChange]);

  const openServiceDrawer = useCallback(() => {
    setShowServiceDrawer(true);
    onNestedDrawerChange?.(true);
  }, [onNestedDrawerChange]);

  useEffect(() => {
    if (showServiceDrawer && onNestedDrawerChange) onNestedDrawerChange(true);
  }, [showServiceDrawer, onNestedDrawerChange]);

  const selectedIds = Array.isArray(value) ? value : [];
  const valueRef = useRef(value);
  valueRef.current = value;
  const optionsSource = displayServices !== undefined ? displayServices : services;

  const validServiceIds = useMemo(() => {
    const list = optionsSource || [];
    const validSet = new Set(list.map((s) => s.id));
    return selectedIds.filter((id) => validSet.has(id) || recentlyCreatedRef.current[id]);
  }, [optionsSource, selectedIds]);

  useEffect(() => {
    const list = optionsSource || [];
    const validSet = new Set(list.map((s) => s.id));
    const pruned = selectedIds.filter((id) => validSet.has(id) || recentlyCreatedRef.current[id]);
    if (pruned.length !== selectedIds.length && onChange) {
      onChange(pruned);
    }
  }, [optionsSource, selectedIds, onChange]);

  const serviceOptions = useMemo(() => {
    if (!optionsSource || optionsSource.length === 0) return [];
    return optionsSource.map((service) => ({
      value: service.id,
      label: service.name || 'Unnamed Service',
    }));
  }, [optionsSource, selectedIds, multiple]);

  const handleSelect = (selectedId) => {
    if (!selectedId) return;
    if (multiple) {
      if (!selectedIds.includes(selectedId)) {
        onChange([...selectedIds, selectedId]);
      }
    } else {
      onChange([selectedId]);
    }
  };

  const handleRemove = (serviceId) => {
    onChange(selectedIds.filter((id) => id !== serviceId));
  };

  const handleCreateService = async (serviceData) => {
    if (onAddServiceLocally) {
      onAddServiceLocally(serviceData);
      const currentIds = Array.isArray(valueRef.current) ? valueRef.current : [];
      if (!currentIds.includes(serviceData.id)) {
        if (multiple) {
          recentlyCreatedRef.current[serviceData.id] = { id: serviceData.id, name: serviceData.name || 'Unnamed Service' };
          onChange([...currentIds, serviceData.id]);
        } else {
          onChange([serviceData.id]);
        }
      }
      setSavingService(false);
      closeServiceDrawer();
      return;
    }
    if (!onServiceCreated) {
      console.error('ServiceSelector: onServiceCreated callback not provided');
      alert('Error: Service creation is not available');
      return;
    }
    setSavingService(true);
    try {
      const updatedServices = [...(services || []), serviceData];
      await Promise.resolve(onServiceCreated(updatedServices));
      const currentIds = Array.isArray(valueRef.current) ? valueRef.current : [];
      if (!currentIds.includes(serviceData.id)) {
        if (multiple) {
          recentlyCreatedRef.current[serviceData.id] = { id: serviceData.id, name: serviceData.name || 'Unnamed Service' };
          onChange([...currentIds, serviceData.id]);
        } else {
          onChange([serviceData.id]);
        }
      }
    } catch (error) {
      console.error('Failed to create service:', error);
      alert(`Failed to create service: ${error.message || 'Unknown error'}`);
    } finally {
      setSavingService(false);
      closeServiceDrawer();
    }
  };

  const dropdownValue = multiple ? '' : (selectedIds[0] ?? '');

  return (
    <div>
      {label ? (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      ) : null}
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <Dropdown
            id="service-select"
            label=""
            value={dropdownValue}
            onChange={(e) => {
              const id = e.target.value ?? '';
              if (id) handleSelect(id);
            }}
            options={[{ value: '', label: dropdownPlaceholder }, ...serviceOptions]}
            placeholder={dropdownPlaceholder}
            disabled={disabled}
            searchable={serviceOptions.length > 5}
            searchThreshold={5}
            usePortal
          />
        </div>
        <PrimaryButton
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openServiceDrawer();
          }}
          disabled={disabled}
          className="flex-shrink-0 gap-1.5 h-9 px-4"
          data-testid="add-service-from-drawer"
        >
          <HiPlus className="w-4 h-4" />
          {addButtonLabel}
        </PrimaryButton>
      </div>
      {multiple && validServiceIds.length > 0 ? (
        <div className="mt-3">
          {chipsSectionLabel ? (
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{chipsSectionLabel}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {validServiceIds.map((serviceId) => {
              const fromRecent = recentlyCreatedRef.current[serviceId];
              const service = fromRecent || (services || []).find((s) => s.id === serviceId);
              const serviceName = service?.name || serviceId;
              return (
                <span
                  key={serviceId}
                  className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary-50 dark:bg-gray-700 text-primary-800 dark:text-gray-200 border border-primary-200 dark:border-gray-600 text-sm font-medium"
                >
                  {serviceName}
                  <button
                    type="button"
                    onClick={() => handleRemove(serviceId)}
                    disabled={disabled}
                    className="p-0.5 rounded-full hover:bg-primary-200 dark:hover:bg-gray-600 text-primary-700 dark:text-gray-300 focus:outline-none"
                    aria-label={`Remove ${serviceName}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {showServiceDrawer ? (
        <Drawer
          isOpen={showServiceDrawer}
          onClose={(e) => {
            e?.stopPropagation?.();
            closeServiceDrawer();
          }}
          title={drawerTitle}
          width={drawerWidth}
          zIndex={110}
        >
          <AddServiceForm
            mode="drawer"
            teamMembers={teamMembers}
            existingServices={services || []}
            onSubmit={async (data) => {
              try {
                await handleCreateService(data);
              } catch (err) {
                console.error('ServiceSelector AddServiceForm onSubmit:', err);
              }
            }}
            onCancel={closeServiceDrawer}
            saving={savingService}
            preselectedTeamMemberIds={preselectedTeamMemberIds}
          />
        </Drawer>
      ) : null}
    </div>
  );
}
