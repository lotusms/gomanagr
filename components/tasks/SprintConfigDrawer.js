import { useState, useEffect, useRef } from 'react';
import {
  getDefaultTaskSettings,
  SPRINT_WEEKS_OPTIONS,
  DEFAULT_SPRINT_WEEKS,
} from '@/lib/taskSettings';
import { Drawer } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import DateField from '@/components/ui/DateField';
import Dropdown from '@/components/ui/Dropdown';

export default function SprintConfigDrawer({ isOpen, onClose, orgId, userId, taskSettings: initialSettings, onSave }) {
  const defaults = getDefaultTaskSettings();
  const [sprintWeeks, setSprintWeeks] = useState(initialSettings?.sprintWeeks ?? defaults.sprintWeeks);
  const [sprintStartDate, setSprintStartDate] = useState(initialSettings?.sprintStartDate ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current && initialSettings) {
      setSprintWeeks(initialSettings.sprintWeeks ?? defaults.sprintWeeks);
      setSprintStartDate(initialSettings.sprintStartDate ?? '');
      setSaveError(null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialSettings]);

  const handleSprintWeeksChange = (e) => {
    const v = e.target.value;
    const num = parseInt(v, 10);
    setSprintWeeks(SPRINT_WEEKS_OPTIONS.includes(num) ? num : DEFAULT_SPRINT_WEEKS);
  };

  const handleSprintStartDateChange = (e) => {
    setSprintStartDate(e.target.value && e.target.value.trim() ? e.target.value.trim() : '');
  };

  const handleSave = async () => {
    if (!orgId || !userId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const taskSettings = {
        ...(initialSettings || defaults),
        sprintWeeks,
        sprintStartDate: sprintStartDate && sprintStartDate.trim() ? sprintStartDate.trim() : null,
      };
      const res = await fetch('/api/update-org-task-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskSettings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSave?.(taskSettings);
      onClose();
    } catch (e) {
      setSaveError(e.message || 'Failed to save sprint config');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Sprint settings"
      width="28rem"
    >
      <div className="px-6 py-4 space-y-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure when the Gantt sprint cycle starts and how long each sprint is. These apply to the Gantt view only.
        </p>
        <DateField
          id="sprint-start-date"
          label="Sprint start date"
          value={sprintStartDate}
          onChange={handleSprintStartDateChange}
          variant="light"
          placeholder="e.g. first Monday of cycle"
          min="2000-01-01"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Leave empty to use the current week&apos;s Monday as the start.
        </p>
        <Dropdown
          id="sprint-weeks"
          name="sprintWeeks"
          label="Sprint length"
          value={String(sprintWeeks)}
          onChange={handleSprintWeeksChange}
          options={SPRINT_WEEKS_OPTIONS.map((n) => ({ value: String(n), label: `${n} week${n === 1 ? '' : 's'}` }))}
          placeholder={`${DEFAULT_SPRINT_WEEKS} weeks`}
        />
        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {saveError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-600">
          <SecondaryButton onClick={onClose} disabled={saving}>
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
