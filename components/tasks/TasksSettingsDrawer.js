import { useState, useEffect, useRef } from 'react';
import { TASK_STATUSES } from '@/config/taskConstants';
import {
  getDefaultTaskSettings,
  COLUMN_LABELS,
  DEFAULT_COLUMNS,
} from '@/lib/taskSettings';
import { Drawer } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import InputField from '@/components/ui/InputField';
import Switch from '@/components/ui/Switch';
import Dropdown from '@/components/ui/Dropdown';

const COLUMN_KEYS = Object.keys(DEFAULT_COLUMNS);

export default function TasksSettingsDrawer({ isOpen, onClose, orgId, userId, taskSettings: initialSettings, onSave }) {
  const [settings, setSettings] = useState(getDefaultTaskSettings());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const prevOpenRef = useRef(false);

  // When drawer opens, sync form from server (initialSettings from parent)
  useEffect(() => {
    if (isOpen && !prevOpenRef.current && initialSettings) {
      setSettings(initialSettings);
      setSaveError(null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialSettings]);

  const handleColumnToggle = (key, checked) => {
    setSettings((prev) => ({
      ...prev,
      columns: { ...prev.columns, [key]: checked },
    }));
  };

  const handleStatusLabelChange = (value, label) => {
    setSettings((prev) => ({
      ...prev,
      statusLabels: { ...prev.statusLabels, [value]: label || (TASK_STATUSES.find((s) => s.value === value)?.label ?? value) },
    }));
  };

  const handleViewToggle = (viewKey, checked) => {
    setSettings((prev) => ({
      ...prev,
      views: { ...prev.views, [viewKey]: checked },
    }));
  };

  const handleDefaultViewChange = (e) => {
    const v = e.target.value;
    setSettings((prev) => ({ ...prev, defaultView: v || 'board' }));
  };

  const handleSave = async () => {
    if (!orgId || !userId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/update-org-task-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskSettings: settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSave?.(settings);
      onClose();
    } catch (e) {
      setSaveError(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const defaultViewOptions = [
    { value: 'board', label: 'Board' },
    { value: 'list', label: 'Table' },
    { value: 'calendar', label: 'Calendar' },
    { value: 'gantt', label: 'Gantt' },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Task settings"
      width="28rem"
    >
      <div className="px-6 py-4 space-y-8">
        {/* Table columns */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Table columns</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Choose which columns appear in the Table view.
          </p>
          <ul className="space-y-2">
            {COLUMN_KEYS.map((key) => (
              <li key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {COLUMN_LABELS[key] ?? key}
                </span>
                <Switch
                  checked={settings.columns[key] !== false}
                  onCheckedChange={(checked) => handleColumnToggle(key, checked)}
                  aria-label={`Toggle ${COLUMN_LABELS[key] ?? key}`}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* Status names */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Status names</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Customize how statuses appear (e.g. &quot;Completed&quot; → &quot;Done&quot;, &quot;In production&quot;).
          </p>
          <div className="space-y-3">
            {TASK_STATUSES.map((s) => (
              <InputField
                key={s.value}
                id={`status-${s.value}`}
                label={s.value.replace(/_/g, ' ').charAt(0).toUpperCase() + s.value.replace(/_/g, ' ').slice(1)}
                value={settings.statusLabels[s.value] ?? s.label}
                onChange={(e) => handleStatusLabelChange(s.value, e.target.value)}
                variant="light"
                placeholder={s.label}
              />
            ))}
          </div>
        </section>

        {/* Views */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Views</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Board is always shown. You can hide Table, Calendar, and Gantt for the organization.
          </p>
          <ul className="space-y-2">
            <li className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Table view</span>
              <Switch
                checked={settings.views.list !== false}
                onCheckedChange={(checked) => handleViewToggle('list', checked)}
                aria-label="Show Table view"
              />
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Calendar view</span>
              <Switch
                checked={settings.views.calendar !== false}
                onCheckedChange={(checked) => handleViewToggle('calendar', checked)}
                aria-label="Show Calendar view"
              />
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Gantt view</span>
              <Switch
                checked={settings.views.gantt !== false}
                onCheckedChange={(checked) => handleViewToggle('gantt', checked)}
                aria-label="Show Gantt view"
              />
            </li>
          </ul>
        </section>

        {/* Default view */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Default view</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Which view to open when visiting the task page.
          </p>
          <Dropdown
            id="default-view"
            name="defaultView"
            value={settings.defaultView}
            onChange={handleDefaultViewChange}
            options={defaultViewOptions}
            placeholder="Board"
          />
        </section>

        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400 pt-2" role="alert">
            {saveError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-600">
          <SecondaryButton
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </div>
      </div>
    </Drawer>
  );
}
