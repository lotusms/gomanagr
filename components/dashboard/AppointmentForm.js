import { useState, useEffect, useMemo } from 'react';
import InputField from '@/components/ui/InputField';
import DateField from '@/components/ui/DateField';
import TimeField from '@/components/ui/TimeField';
import Dropdown from '@/components/ui/Dropdown';
import { ChipsMulti } from '@/components/ui/Chips';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import Drawer from '@/components/ui/Drawer';
import ClientForm from '@/components/clients/ClientForm';
import { buildTimeSlots, parseHour, parseTimeToSlotIndex } from './scheduleTimeUtils';

/**
 * Appointment Form Component
 * @param {Object} props
 * @param {Array} props.teamMembers - Array of team members
 * @param {string} props.businessHoursStart - Business hours start (e.g., '08:00')
 * @param {string} props.businessHoursEnd - Business hours end (e.g., '18:00')
 * @param {string} props.timeFormat - '12h' or '24h'
 * @param {string} props.timezone - User's timezone (e.g., 'America/New_York')
 * @param {string} props.dateFormat - User's date format preference (e.g., 'MM/DD/YYYY')
 * @param {Object} props.initialAppointment - Existing appointment to edit (optional)
 * @param {Date} props.selectedDate - Pre-selected date (optional)
 * @param {Array} props.appointments - Array of existing appointments (optional)
 * @param {Array} props.services - Array of services (optional)
 * @param {Array} props.clients - Array of clients (optional)
 * @param {Function} props.onClientAdd - Callback when a new client is added
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
  timezone = 'UTC',
  dateFormat = 'MM/DD/YYYY',
  initialAppointment = null,
  selectedDate = null,
  appointments = [],
  services = [],
  clients = [],
  onClientAdd,
  onSubmit,
  onCancel,
  onDelete,
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
  const [selectedServices, setSelectedServices] = useState([]);
  const [label, setLabel] = useState('');
  const [clientId, setClientId] = useState('');
  const [showClientDrawer, setShowClientDrawer] = useState(false);
  const [errors, setErrors] = useState({});

  // Get current date and time in user's timezone
  const getCurrentDateTimeInTimezone = useMemo(() => {
    return () => {
      const now = new Date();
      // Format date and time in user's timezone
      const dateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }); // en-CA gives YYYY-MM-DD
      const timeStr = now.toLocaleTimeString('en-US', { 
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      return { date: dateStr, time: timeStr };
    };
  }, [timezone]);

  // Get today's date in YYYY-MM-DD format (in user's timezone)
  const todayDateString = useMemo(() => {
    return getCurrentDateTimeInTimezone().date;
  }, [getCurrentDateTimeInTimezone]);

  // Check if a time slot is in the past
  const isTimeSlotInPast = useMemo(() => {
    return (timeSlot) => {
      // Only check if date is today
      if (!date || date !== todayDateString) return false;

      // Get current time in user's timezone
      const { time: currentTimeStr } = getCurrentDateTimeInTimezone();
      const [currentHours, currentMinutes] = currentTimeStr.split(':').map(Number);

      // Parse time slot to compare with current time
      // Handle both 12h and 24h formats
      let slotHours, slotMinutes;
      if (timeFormat === '12h') {
        // Parse 12h format (e.g., "10:30 AM" or "6:00 PM")
        const match = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          slotHours = parseInt(match[1], 10);
          slotMinutes = parseInt(match[2], 10);
          if (match[3].toUpperCase() === 'PM' && slotHours !== 12) {
            slotHours += 12;
          } else if (match[3].toUpperCase() === 'AM' && slotHours === 12) {
            slotHours = 0;
          }
        } else {
          return false; // Invalid format
        }
      } else {
        // Parse 24h format (e.g., "10:30" or "18:00")
        [slotHours, slotMinutes] = timeSlot.split(':').map(Number);
      }

      // Convert to minutes since midnight for easier comparison
      const slotMinutesSinceMidnight = slotHours * 60 + slotMinutes;
      const currentMinutesSinceMidnight = currentHours * 60 + currentMinutes;

      // Time slot is in the past if it's before current time
      return slotMinutesSinceMidnight < currentMinutesSinceMidnight;
    };
  }, [date, todayDateString, getCurrentDateTimeInTimezone, timeFormat]);

  // Check if a time slot conflicts with existing appointments for the selected staff member
  const isTimeSlotConflicting = useMemo(() => {
    return (timeSlot) => {
      // Only check conflicts if staff member and date are selected
      if (!staffId || !date) return false;

      // Find existing appointments for the selected staff member on the selected date
      // Exclude the current appointment if editing
      const conflictingAppointments = appointments.filter((apt) => {
        // Skip if this is the appointment we're editing
        if (initialAppointment && apt.id === initialAppointment.id) return false;
        
        // Check if appointment is for the same staff member
        if (String(apt.staffId) !== String(staffId)) return false;
        
        // Check if appointment is on the same date
        let appointmentDateKey;
        if (typeof apt.date === 'string') {
          appointmentDateKey = apt.date;
        } else {
          const aptDate = new Date(apt.date);
          appointmentDateKey = aptDate.toISOString().split('T')[0];
        }
        
        return appointmentDateKey === date;
      });

      // Check if the time slot falls within any conflicting appointment's time range
      return conflictingAppointments.some((apt) => {
        const slotIndex = parseTimeToSlotIndex(timeSlot, startHour);
        const aptStartSlot = parseTimeToSlotIndex(apt.start, startHour);
        const aptEndSlot = parseTimeToSlotIndex(apt.end, startHour);
        
        // Time slot conflicts if it falls within the appointment's time range
        // (start is inclusive, end is exclusive)
        return slotIndex >= aptStartSlot && slotIndex < aptEndSlot;
      });
    };
  }, [staffId, date, appointments, initialAppointment, startHour]);

  // Generate time slot options with disabled state for conflicting slots and past times
  const timeSlotOptions = useMemo(() => {
    return timeSlots.map((slot) => ({
      value: slot,
      label: slot,
      disabled: isTimeSlotConflicting(slot) || isTimeSlotInPast(slot),
    }));
  }, [timeSlots, isTimeSlotConflicting, isTimeSlotInPast]);

  // Generate team member options (must be before useEffect that uses them)
  const teamMemberOptions = useMemo(() => {
    return teamMembers.map((member) => ({
      value: member.id,
      label: member.name || 'Unnamed',
    }));
  }, [teamMembers]);

  // Generate client options
  const clientOptions = useMemo(() => {
    return clients.map((client) => ({
      value: client.id,
      label: client.company ? `${client.name} (${client.company})` : client.name,
    }));
  }, [clients]);

  // Filter services by selected team member
  const availableServices = useMemo(() => {
    if (!staffId) return [];
    return services.filter((service) => {
      const assignedIds = service.assignedTeamMemberIds || [];
      return assignedIds.includes(staffId);
    });
  }, [services, staffId]);

  // Service names for chips (only services assigned to selected team member)
  const serviceNames = useMemo(() => {
    return availableServices.map((service) => service.name);
  }, [availableServices]);

  // Initialize form: set date and label from initial appointment; dropdowns set in separate effect
  useEffect(() => {
    if (initialAppointment) {
      setDate(initialAppointment.date || '');
      setLabel(initialAppointment.label || '');
      setSelectedServices(initialAppointment.services || []);
      setClientId(initialAppointment.clientId || '');
      // staffId, startTime, endTime are set by the effect below so values match dropdown options
    } else {
      // Use selectedDate if provided, otherwise default to today
      // Ensure we never set a past date (using user's timezone)
      let defaultDate = selectedDate
        ? selectedDate.toISOString().split('T')[0]
        : todayDateString;
      
      // If selectedDate is in the past (in user's timezone), use today instead
      const currentDateTime = getCurrentDateTimeInTimezone();
      if (defaultDate < currentDateTime.date) {
        defaultDate = todayDateString;
      }
      
      setDate(defaultDate);
      setStaffId('');
      setStartTime('');
      setEndTime('');
      setSelectedServices([]);
      setLabel('');
      setClientId('');
    }
    setShowClientDrawer(false);
    setErrors({});
  }, [initialAppointment, selectedDate, todayDateString, getCurrentDateTimeInTimezone]);

  // Clear selected services when team member changes (if not editing)
  useEffect(() => {
    if (!initialAppointment && staffId) {
      // Filter services to only those assigned to the selected team member
      const validServices = selectedServices.filter((serviceName) => {
        const service = services.find((s) => s.name === serviceName);
        return service?.assignedTeamMemberIds?.includes(staffId);
      });
      if (validServices.length !== selectedServices.length) {
        setSelectedServices(validServices);
      }
    }
  }, [staffId, services, initialAppointment]);

  // Clear startTime if it becomes disabled when staffId or date changes
  // Also clear if date becomes past or startTime becomes past
  useEffect(() => {
    if (!initialAppointment) {
      // Clear if date is in the past (using user's timezone)
      if (date) {
        const currentDateTime = getCurrentDateTimeInTimezone();
        if (date < currentDateTime.date) {
          setDate(todayDateString);
          setStartTime('');
          setEndTime('');
          return;
        }
      }

      // Clear startTime if it becomes disabled
      if (startTime) {
        const selectedSlot = timeSlotOptions.find((opt) => opt.value === startTime);
        if (selectedSlot && selectedSlot.disabled) {
          setStartTime('');
          setEndTime(''); // Also clear endTime since it depends on startTime
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, date, timeSlotOptions, todayDateString, getCurrentDateTimeInTimezone]);

  // Separate effect to set dropdown values when editing (same pattern as location in AddTeamMemberForm)
  // Only set values that exist in options so the dropdowns show the selection
  // Only runs when initialAppointment.id changes (switching appointments) or when options become available
  useEffect(() => {
    if (!initialAppointment) {
      setStaffId('');
      setStartTime('');
      setEndTime('');
      return;
    }

    // Only initialize if options are available
    if (teamMemberOptions.length === 0 || timeSlotOptions.length === 0) {
      return;
    }

    const staffOpt = teamMemberOptions.find(
      (opt) => String(opt.value) === String(initialAppointment.staffId)
    );
    if (staffOpt) {
      setStaffId(String(staffOpt.value));
    } else {
      setStaffId('');
    }

    const startOpt = timeSlotOptions.find(
      (opt) => String(opt.value) === String(initialAppointment.start) && !opt.disabled
    );
    if (startOpt) {
      setStartTime(String(startOpt.value));
    } else {
      setStartTime('');
    }

    const endOpt = timeSlotOptions.find(
      (opt) => String(opt.value) === String(initialAppointment.end)
    );
    if (endOpt) {
      setEndTime(String(endOpt.value));
    } else {
      setEndTime('');
    }
    // Only depend on initialAppointment.id to avoid overwriting user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAppointment?.id]);

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!staffId) {
      newErrors.staffId = 'Please select a team member';
    }

    if (!date) {
      newErrors.date = 'Please select a date';
    } else {
      // Check if date is in the past (using user's timezone)
      const currentDateTime = getCurrentDateTimeInTimezone();
      const todayInTimezone = currentDateTime.date;
      
      if (date < todayInTimezone) {
        newErrors.date = 'Cannot schedule appointments in the past';
      }
    }

    if (!startTime) {
      newErrors.startTime = 'Please select a start time';
    } else if (date === todayDateString) {
      // Check if start time is in the past (only if date is today, using user's timezone)
      const currentDateTime = getCurrentDateTimeInTimezone();
      const [currentHours, currentMinutes] = currentDateTime.time.split(':').map(Number);
      
      // Parse start time (handle both 12h and 24h formats)
      let startHours, startMinutes;
      if (timeFormat === '12h') {
        const match = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          startHours = parseInt(match[1], 10);
          startMinutes = parseInt(match[2], 10);
          if (match[3].toUpperCase() === 'PM' && startHours !== 12) {
            startHours += 12;
          } else if (match[3].toUpperCase() === 'AM' && startHours === 12) {
            startHours = 0;
          }
        }
      } else {
        [startHours, startMinutes] = startTime.split(':').map(Number);
      }
      
      const startMinutesSinceMidnight = startHours * 60 + startMinutes;
      const currentMinutesSinceMidnight = currentHours * 60 + currentMinutes;
      
      if (startMinutesSinceMidnight < currentMinutesSinceMidnight) {
        newErrors.startTime = 'Cannot schedule appointments in the past';
      }
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

    // Notes is optional, no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle adding a new client
  const handleAddClient = async (clientData) => {
    if (!onClientAdd) return;

    try {
      const newClientId = await onClientAdd(clientData);
      if (newClientId) {
        setClientId(newClientId);
        setShowClientDrawer(false);
        setErrors((prev) => ({ ...prev, client: '' }));
      }
    } catch (error) {
      console.error('Failed to add client:', error);
      setErrors((prev) => ({ ...prev, client: 'Failed to add client. Please try again.' }));
    }
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
      services: selectedServices,
      label: label.trim() || undefined,
      clientId: clientId || undefined,
      createdAt: initialAppointment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(appointmentData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Dropdown
            key={`staffId-${staffId || 'empty'}-${initialAppointment?.id ?? 'new'}`}
            id="staffId"
            label="Team Member"
            value={staffId}
            onChange={(e) => {
              setStaffId(e.target.value ?? '');
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
          <DateField
            id="date"
            label="Date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setErrors((prev) => ({ ...prev, date: '' }));
            }}
            required
            error={errors.date}
            variant="light"
            min={todayDateString}
            timezone={timezone}
            dateFormat={dateFormat}
          />
        </div>
        <div>
          <TimeField
            key={`startTime-${startTime || 'empty'}-${initialAppointment?.id ?? 'new'}`}
            id="startTime"
            label="Start Time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value ?? '');
              setErrors((prev) => ({ ...prev, startTime: '', endTime: '' }));
            }}
            options={timeSlotOptions}
            placeholder="Select start time..."
            required
            error={errors.startTime}
            variant="light"
            businessHoursStart={businessHoursStart}
            businessHoursEnd={businessHoursEnd}
            timeFormat={timeFormat}
          />
        </div>

        <div>
          <TimeField
            key={`endTime-${endTime || 'empty'}-${initialAppointment?.id ?? 'new'}`}
            id="endTime"
            label="End Time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value ?? '');
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
            variant="light"
            businessHoursStart={businessHoursStart}
            businessHoursEnd={businessHoursEnd}
            timeFormat={timeFormat}
          />
        </div>
      </div>

      {staffId && serviceNames.length > 0 && (
        <div>
          <ChipsMulti
            id="services"
            label="Services"
            options={serviceNames}
            value={selectedServices}
            onValueChange={(newServices) => {
              setSelectedServices(newServices);
              setErrors((prev) => ({ ...prev, services: '' }));
            }}
            variant="light"
            layout="flex"
          />
          {errors.services && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.services}</p>}
        </div>
      )}

      {/* Client Section */}
      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Dropdown
                key={`clientId-${clientId || 'empty'}-${initialAppointment?.id ?? 'new'}`}
                id="clientId"
                label=""
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value ?? '');
                  setErrors((prev) => ({ ...prev, client: '' }));
                }}
                options={[
                  { value: '', label: 'None' },
                  ...clientOptions,
                ]}
                placeholder="Select client..."
                error={errors.client}
              />
            </div>
            <PrimaryButton
              type="button"
              onClick={() => setShowClientDrawer(true)}
              className="whitespace-nowrap"
            >
              Add
            </PrimaryButton>
          </div>
          {errors.client && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.client}</p>}
        </div>
      </div>

      {/* Client Drawer */}
      <Drawer
        isOpen={showClientDrawer}
        onClose={() => setShowClientDrawer(false)}
        title="Add Client"
      >
        <ClientForm
          onSubmit={handleAddClient}
          onCancel={() => setShowClientDrawer(false)}
          saving={saving}
        />
      </Drawer>

      <div>
        <InputField
          id="label"
          type="text"
          label="Notes"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setErrors((prev) => ({ ...prev, label: '' }));
          }}
          placeholder="e.g., Client consultation, Team meeting..."
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
