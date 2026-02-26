/**
 * Appointment recurrence: toggle, frequency, specific days (S M T W T F S),
 * monthly day, recurrence start/end dates. Isolated component for add/edit appointment.
 *
 * Value shape:
 * {
 *   isRecurring: boolean,
 *   frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'specific_days',
 *   specificDays: number[],  // 0=Sun..6=Sat, when frequency === 'specific_days'
 *   monthlyDay: number,     // 1-31 when frequency === 'monthly'
 *   recurrenceStart: string, // YYYY-MM-DD
 *   recurrenceEnd: string | null, // YYYY-MM-DD or null when no end date
 *   noEndDate: boolean,
 * }
 */

import { useState, useEffect } from 'react';
import Switch from '@/components/ui/Switch';
import DateField from '@/components/ui/DateField';
import Dropdown from '@/components/ui/Dropdown';
import Checkbox from '@/components/ui/Checkbox';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'specific_days', label: 'Specific days' },
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // 0 = Sunday

const MONTHLY_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`,
}));

const defaultRecurrence = () => ({
  isRecurring: false,
  frequency: 'weekly',
  specificDays: [],
  monthlyDay: 1,
  recurrenceStart: '',
  recurrenceEnd: null,
  noEndDate: false,
});

export default function AppointmentRecurrence({
  value = null,
  onChange,
  minDate = '',
  timezone = 'UTC',
  dateFormat = 'MM/DD/YYYY',
  disabled = false,
}) {
  const [recurrence, setRecurrence] = useState(() => value && typeof value === 'object' ? { ...defaultRecurrence(), ...value } : defaultRecurrence());

  useEffect(() => {
    if (value && typeof value === 'object') {
      setRecurrence((prev) => ({ ...defaultRecurrence(), ...prev, ...value }));
    }
  }, [
    value?.isRecurring,
    value?.frequency,
    value?.specificDays,
    value?.monthlyDay,
    value?.recurrenceStart,
    value?.recurrenceEnd,
    value?.noEndDate,
  ]);

  const update = (updates) => {
    const next = { ...recurrence, ...updates };
    if (updates.noEndDate === true) {
      next.recurrenceEnd = null;
    }
    if (updates.isRecurring === false) {
      next.recurrenceStart = '';
      next.recurrenceEnd = null;
      next.noEndDate = false;
    }
    setRecurrence(next);
    onChange?.(next);
  };

  const toggleDay = (dayIndex) => {
    const current = recurrence.specificDays || [];
    const next = current.includes(dayIndex)
      ? current.filter((d) => d !== dayIndex)
      : [...current, dayIndex].sort((a, b) => a - b);
    update({ specificDays: next });
  };

  if (!recurrence) return null;

  const showSpecificDays = recurrence.isRecurring && recurrence.frequency === 'specific_days';
  const showMonthlyDay = recurrence.isRecurring && recurrence.frequency === 'monthly';

  return (
    <div className="space-y-4 ">
      <div className="flex items-center justify-between">
        <Switch
          id="recurrence-toggle"
          label="Recurring appointment"
          checked={!!recurrence.isRecurring}
          onCheckedChange={(checked) => update({ isRecurring: !!checked })}
          disabled={disabled}
        />
      </div>

      {recurrence.isRecurring && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency
            </label>
            <Dropdown
              id="recurrence-frequency"
              label=""
              value={recurrence.frequency || 'weekly'}
              onChange={(e) => update({ frequency: e.target.value || 'weekly' })}
              options={FREQUENCY_OPTIONS}
              placeholder="Select frequency"
              disabled={disabled}
            />
          </div>

          {showSpecificDays && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Days of the week
              </label>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, dayIndex) => {
                  const isSelected = (recurrence.specificDays || []).includes(dayIndex);
                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      onClick={() => toggleDay(dayIndex)}
                      disabled={disabled}
                      className={`
                        w-9 h-9 rounded-lg text-sm font-medium transition-colors
                        ${isSelected
                          ? 'bg-primary-600 text-white border border-primary-600'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}
                      `}
                      aria-label={`${label}${isSelected ? ' selected' : ''}`}
                      aria-pressed={isSelected}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showMonthlyDay && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Day of month
              </label>
              <Dropdown
                id="recurrence-monthly-day"
                label=""
                value={String(recurrence.monthlyDay ?? 1)}
                onChange={(e) => update({ monthlyDay: parseInt(e.target.value, 10) || 1 })}
                options={MONTHLY_DAY_OPTIONS}
                disabled={disabled}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DateField
              id="recurrence-start"
              label="Recurrence start date"
              value={recurrence.recurrenceStart || ''}
              onChange={(e) => update({ recurrenceStart: e.target.value || '' })}
              min={minDate}
              timezone={timezone}
              dateFormat={dateFormat}
              variant="light"
              disabled={disabled}
            />
            {!recurrence.noEndDate ? (
              <DateField
                id="recurrence-end"
                label="Recurrence end date"
                value={recurrence.recurrenceEnd || ''}
                onChange={(e) => update({ recurrenceEnd: e.target.value || null })}
                min={recurrence.recurrenceStart || minDate}
                timezone={timezone}
                dateFormat={dateFormat}
                variant="light"
                disabled={disabled}
              />
            ) : (
              <div className="flex items-end pb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">No end date (occurrences will be capped to avoid running endlessly)</span>
              </div>
            )}
          </div>

          <div>
            <Checkbox
              id="recurrence-no-end"
              label="No end date"
              checked={!!recurrence.noEndDate}
              onCheckedChange={(checked) => update({ noEndDate: !!checked })}
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
  );
}

export { defaultRecurrence, FREQUENCY_OPTIONS, DAY_LABELS };
