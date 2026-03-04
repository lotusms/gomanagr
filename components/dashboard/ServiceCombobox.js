/**
 * Compact service selector: searchable dropdown of services plus a small "Add" button
 * that opens a drawer to create a new service. New services are persisted via onServiceCreated
 * and then selected in this field. Used in line items and anywhere a single service name is needed.
 *
 * @param {string} id - Input id
 * @param {Array<{ id: string, name: string }>} services - List of services (from org or user)
 * @param {string} value - Current value (service name)
 * @param {Function} onChange - (serviceName: string) => void
 * @param {Function} onServiceCreated - (updatedServices: Array) => Promise<void> — persist new service to org/user
 * @param {Array} [teamMembers] - For AddServiceForm (assign to team members)
 * @param {string} [placeholder] - e.g. "Select service..."
 * @param {string} [className]
 * @param {string} [addButtonLabel] - Default "Add"
 * @param {string} [drawerTitle] - Default "Add service"
 */

import { useState, useCallback, useMemo } from 'react';
import { Dropdown, Drawer } from '@/components/ui';
import AddServiceForm from '@/components/services/AddServiceForm';
import { HiPlus } from 'react-icons/hi';

export default function ServiceCombobox({
  id,
  services = [],
  value,
  onChange,
  onServiceCreated,
  teamMembers = [],
  placeholder = 'Select service...',
  className = '',
  addButtonLabel = 'Add',
  drawerTitle = 'Add service',
}) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => {
    const byName = (services || []).map((s) => ({
      value: s.name || '',
      label: s.name || 'Unnamed Service',
    })).filter((o) => o.value);
    const hasValue = value && String(value).trim();
    const inList = (services || []).some((s) => (s.name || '').trim() === (value || '').trim());
    if (hasValue && !inList) {
      return [{ value: value.trim(), label: value.trim() }, ...byName];
    }
    return byName;
  }, [services, value]);

  const handleCreateService = useCallback(
    async (serviceData) => {
      if (!onServiceCreated) return;
      setSaving(true);
      try {
        const updatedServices = [...(services || []), serviceData];
        await Promise.resolve(onServiceCreated(updatedServices));
        onChange(serviceData.name || '');
        setShowDrawer(false);
      } catch (err) {
        console.error('ServiceCombobox create service:', err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [services, onServiceCreated, onChange]
  );

  return (
    <div className={`flex gap-1.5 items-stretch ${className}`.trim()}>
      <div className="flex-1 min-w-0">
        <Dropdown
          id={id}
          name={id}
          label=""
          value={value || ''}
          onChange={(e) => onChange(e.target.value ?? '')}
          options={[{ value: '', label: placeholder }, ...options]}
          placeholder={placeholder}
          searchable={true}
          searchThreshold={0}
          usePortal={true}
        />
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowDrawer(true);
        }}
        className="flex-shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-700 text-primary-600 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-600 focus:outline-none focus:ring-1 focus:ring-ternary-500 focus:border-ternary-500 transition-colors"
        title={addButtonLabel}
        aria-label={addButtonLabel}
      >
        <HiPlus className="w-4 h-4" />
      </button>

      {showDrawer && (
        <Drawer
          isOpen={showDrawer}
          onClose={() => setShowDrawer(false)}
          title={drawerTitle}
          width="75vw"
          zIndex={110}
        >
          <AddServiceForm
            teamMembers={teamMembers}
            existingServices={services || []}
            onSubmit={handleCreateService}
            onCancel={() => setShowDrawer(false)}
            saving={saving}
          />
        </Drawer>
      )}
    </div>
  );
}
