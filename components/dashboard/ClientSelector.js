/**
 * Reusable client selector: dropdown to pick existing clients + "Add" button that opens
 * a drawer with ClientForm. Used on Add/Edit Appointment: add client locally (no persist)
 * until appointment is saved; drawer close returns to appointment form (no navigation).
 *
 * @param {Array} clients - Full client list (existing + any pending for display in dropdown)
 * @param {string} value - Selected client ID
 * @param {Function} onChange - (clientId: string) => void
 * @param {Function} [onClientAdd] - (clientData) => Promise<string> — persist and return new client id (when not using local add)
 * @param {Function} [onAddClientLocally] - (clientDataWithId: { id, name, ... }) => void — add client locally only; persist on appointment save. When provided, drawer does not persist.
 * @param {string} [label] - Label for the field (e.g. "Client")
 * @param {boolean} [disabled]
 * @param {string} [dropdownPlaceholder]
 * @param {string} [addButtonLabel] - Default "Add"
 * @param {string} [drawerTitle] - Default "Add Client"
 * @param {Function} [onNestedDrawerChange] - (open: boolean) => void — so parent can avoid closing on overlay click
 */

import { useState, useMemo, useCallback } from 'react';
import { PrimaryButton } from '@/components/ui/buttons';
import { Dropdown, Drawer } from '@/components/ui';
import ClientForm from '@/components/clients/ClientForm';
import { generateClientId } from '@/utils/clientIdGenerator';
import { HiPlus } from 'react-icons/hi';

export default function ClientSelector({
  clients = [],
  value = '',
  onChange,
  onClientAdd,
  onAddClientLocally,
  label = 'Client',
  disabled = false,
  dropdownPlaceholder = 'Select client...',
  addButtonLabel = 'Add',
  drawerTitle = 'Add Client',
  onNestedDrawerChange,
}) {
  const [showClientDrawer, setShowClientDrawer] = useState(false);
  const [savingClient, setSavingClient] = useState(false);

  const closeClientDrawer = useCallback(() => {
    setShowClientDrawer(false);
    onNestedDrawerChange?.(false);
  }, [onNestedDrawerChange]);

  const openClientDrawer = useCallback(() => {
    setShowClientDrawer(true);
    onNestedDrawerChange?.(true);
  }, [onNestedDrawerChange]);

  const clientOptions = useMemo(() => {
    if (!clients || clients.length === 0) return [];
    return clients.map((client) => ({
      value: client.id,
      label: client.company ? `${client.name} (${client.company})` : client.name || 'Unnamed',
    }));
  }, [clients]);

  const handleAddClient = useCallback(
    async (clientData) => {
      if (onAddClientLocally) {
        const existingIds = (clients || []).map((c) => c.id).filter(Boolean);
        const newId = generateClientId(existingIds);
        const clientWithId = { ...clientData, id: newId };
        onAddClientLocally(clientWithId);
        onChange(newId);
        setShowClientDrawer(false);
        onNestedDrawerChange?.(false);
        return;
      }
      if (!onClientAdd) return;
      setSavingClient(true);
      try {
        const newClientId = await onClientAdd(clientData);
        if (newClientId) {
          onChange(newClientId);
          setShowClientDrawer(false);
          onNestedDrawerChange?.(false);
        }
      } catch (err) {
        console.error('ClientSelector add client:', err);
        throw err;
      } finally {
        setSavingClient(false);
      }
    },
    [clients, onAddClientLocally, onClientAdd, onChange, onNestedDrawerChange]
  );

  const canAdd = !!onAddClientLocally || !!onClientAdd;

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
            id="clientId"
            label=""
            value={value || ''}
            onChange={(e) => onChange(e.target.value ?? '')}
            options={[{ value: '', label: 'None' }, ...clientOptions]}
            placeholder={dropdownPlaceholder}
            disabled={disabled}
          />
        </div>
        {canAdd && (
          <PrimaryButton
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openClientDrawer();
            }}
            disabled={disabled}
            className="whitespace-nowrap flex-shrink-0"
            data-testid="add-client-from-drawer"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            {addButtonLabel}
          </PrimaryButton>
        )}
      </div>

      {showClientDrawer && (
        <Drawer
          isOpen={showClientDrawer}
          onClose={(e) => {
            e?.stopPropagation?.();
            closeClientDrawer();
          }}
          title={drawerTitle}
          zIndex={110}
        >
          <ClientForm
            onSubmit={handleAddClient}
            onCancel={closeClientDrawer}
            saving={savingClient}
          />
        </Drawer>
      )}
    </div>
  );
}
