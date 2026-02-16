import { useState, useEffect, useMemo } from 'react';
import InputField from '@/components/ui/InputField';
import Dropdown from '@/components/ui/Dropdown';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { buildTimeSlots, parseHour, parseTimeToSlotIndex } from './scheduleTimeUtils';

/**
 * Appointment Form Component
 * @param {Object} props
 * @param {Array} props.teamMembers - Array of team members
 * @param {string} props.businessHoursStart - Business hours start (e.g., '08:00')
 * @param {string} props.businessHoursEnd - Business hours end (e.g., '18:00')
 * @param {string} props.timeFormat - '12h' or '24h'
 * @param {Object} props.initialAppointment - Existing appointment to edit (optional)
 * @param {Date} props.selectedDate - Pre-selected date (optional)
 * @param {Function} props.onSubmit - Callback when form is submitted
 * @param {Function} props.onCancel - Callback when form is cancelled
 * @param {Function} props.onDelete - Callback when delete is requested (only shown when editing)
 * @param {boolean} props.saving - Whether form is saving
 */
export default function AppointmentForm({
  teamMembers = [],
  businessHoursStart = '08:00',
  businessHoursEnd = '18:00',
  timeFormat = '24h',
  initialAppointment = null,
  selectedDate = null,
  onSubmit,
  onCancel,
  saving = false,
}) {
  const startHour = parseHour(businessHoursStart);
  const endHour = parseHour(businessHoursEnd);
  const timeSlots = buildTimeSlots(businessHoursStart, businessHoursEnd, timeFormat);

  // Form state
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [label, setLabel] = useState('');
  const [errors, setErrors] = useState({});

  // Initialize form with initial appointment or defaults
  useEffect(() => {
    if (initialAppointment) {
      setStaffId(initialAppointment.staffId || '');
      setDate(initialAppointment.date || '');
      setStartTime(initialAppointment.start || '');
      setEndTime(initialAppointment.end || '');
      setLabel(initialAppointment.label || '');
    } else {
      // Default to today's date if selectedDate is provided, otherwise empty
      const defaultDate = selectedDate
        ? selectedDate.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      setDate(defaultDate);
      setStaffId('');
      setStartTime('');
      setEndTime('');
      setLabel('');
    }
    setErrors({});
  }, [initialAppointment, selectedDate]);

  // Generate time slot options
  const timeSlotOptions = useMemo(() => {
    return timeSlots.map((slot) => ({ value: slot, label: slot }));
  }, [timeSlots]);

  // Generate team member options
  const teamMemberOptions = useMemo(() => {
    return teamMembers.map((member) => ({
      value: member.id,
      label: member.name || 'Unnamed',
    }));
  }, [teamMembers]);

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!staffId) {
      newErrors.staffId = 'Please select a team member';
    }

    if (!date) {
      newErrors.date = 'Please select a date';
    }

    if (!startTime) {
      newErrors.startTime = 'Please select a start time';
    }

    if (!endTime) {
      newErrors.endTime = 'Please select an end time';
    }

    if (startTime && endTime) {
      const startSlot = parseTimeToSlotIndex(startTime, startHour);
      const endSlot = parseTimeToSlotIndex(endTime, startHour);

      if (endSlot <= startSlot) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    if (!label || label.trim() === '') {
      newErrors.label = 'Please enter an appointment description';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const appointmentData = {
      id: initialAppointment?.id || `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      staffId,
      date,
      start: startTime,
      end: endTime,
      label: label.trim(),
      createdAt: initialAppointment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(appointmentData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div>
        <Dropdown
          id="staffId"
          label="Team Member"
          value={staffId}
          onChange={(e) => {
            setStaffId(e.target.value);
            setErrors((prev) => ({ ...prev, staffId: '' }));
          }}
          options={teamMemberOptions}
          placeholder="Select team member..."
          required
          error={errors.staffId}
        />
        {errors.staffId && <p className="mt-1 text-sm text-red-600">{errors.staffId}</p>}
      </div>

      <div>
        <InputField
          id="date"
          type="date"
          label="Date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setErrors((prev) => ({ ...prev, date: '' }));
          }}
          required
          error={errors.date}
          variant="light"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Dropdown
            id="startTime"
            label="Start Time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setErrors((prev) => ({ ...prev, startTime: '', endTime: '' }));
            }}
            options={timeSlotOptions}
            placeholder="Select start time..."
            required
            error={errors.startTime}
          />
          {errors.startTime && <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>}
        </div>

        <div>
          <Dropdown
            id="endTime"
            label="End Time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setErrors((prev) => ({ ...prev, endTime: '' }));
            }}
            options={timeSlotOptions.filter((slot) => {
              if (!startTime) return true;
              const startSlot = parseTimeToSlotIndex(startTime, startHour);
              const slotIndex = parseTimeToSlotIndex(slot.value, startHour);
              return slotIndex > startSlot;
            })}
            placeholder="Select end time..."
            required
            error={errors.endTime}
          />
          {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>}
        </div>
      </div>

      <div>
        <InputField
          id="label"
          type="text"
          label="Description"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setErrors((prev) => ({ ...prev, label: '' }));
          }}
          placeholder="e.g., Client consultation, Team meeting..."
          required
          error={errors.label}
          variant="light"
        />
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        {initialAppointment && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        )}
        <div className="flex justify-end gap-3 ml-auto">
          <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : initialAppointment ? 'Update Appointment' : 'Create Appointment'}
          </PrimaryButton>
        </div>
      </div>
    </form>
  );
}
