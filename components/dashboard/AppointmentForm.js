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
 * @param {string} [props.staffRestrictedToId] - When set (e.g. team member view), staff is fixed to this id and dropdown is hidden
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
  staffRestrictedToId = null,
}) {
  const startHour = parseHour(businessHoursStart);
  const endHour = parseHour(businessHoursEnd);
  const timeSlots = buildTimeSlots(businessHoursStart, businessHoursEnd, timeFormat);

  const [staffId, setStaffId] = useState(staffRestrictedToId || '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [label, setLabel] = useState('');
  const [clientId, setClientId] = useState('');
  const [showClientDrawer, setShowClientDrawer] = useState(false);
  const [errors, setErrors] = useState({});

  const getCurrentDateTimeInTimezone = useMemo(() => {
    return () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }); // en-CA gives YYYY-MM-DD
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      return { date: dateStr, time: timeStr };
    };
  }, [timezone]);

  const getCurrentDateTimeLocal = useMemo(() => {
    return () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-CA'); // no timeZone = local
      const timeStr = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      return { date: dateStr, time: timeStr };
    };
  }, []);

  const todayDateString = useMemo(() => {
    return getCurrentDateTimeInTimezone().date;
  }, [getCurrentDateTimeInTimezone]);

  const todayDateStringLocal = useMemo(() => getCurrentDateTimeLocal().date, [getCurrentDateTimeLocal]);

  const isTimeSlotInPast = useMemo(() => {
    return (timeSlot) => {
      if (!date || date !== todayDateStringLocal) return false;

      const { time: currentTimeStr } = getCurrentDateTimeLocal();
      const parts = currentTimeStr.split(':').map(Number);
      const currentHours = parts[0] ?? 0;
      const currentMinutes = parts[1] ?? 0;

      let slotHours, slotMinutes;
      if (timeFormat === '12h') {
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
        [slotHours, slotMinutes] = timeSlot.split(':').map(Number);
      }

      const slotMinutesSinceMidnight = slotHours * 60 + slotMinutes;
      const currentMinutesSinceMidnight = currentHours * 60 + currentMinutes;

      return slotMinutesSinceMidnight < currentMinutesSinceMidnight;
    };
  }, [date, todayDateStringLocal, getCurrentDateTimeLocal, timeFormat]);

  const isTimeSlotConflicting = useMemo(() => {
    return (timeSlot) => {
      if (!staffId || !date) return false;

      const conflictingAppointments = appointments.filter((apt) => {
        if (initialAppointment && apt.id === initialAppointment.id) return false;
        
        if (String(apt.staffId) !== String(staffId)) return false;
        
        let appointmentDateKey;
        if (typeof apt.date === 'string') {
          appointmentDateKey = apt.date;
        } else {
          const aptDate = new Date(apt.date);
          appointmentDateKey = aptDate.toISOString().split('T')[0];
        }
        
        return appointmentDateKey === date;
      });

      return conflictingAppointments.some((apt) => {
        const slotIndex = parseTimeToSlotIndex(timeSlot, startHour);
        const aptStartSlot = parseTimeToSlotIndex(apt.start, startHour);
        const aptEndSlot = parseTimeToSlotIndex(apt.end, startHour);
        
        return slotIndex >= aptStartSlot && slotIndex < aptEndSlot;
      });
    };
  }, [staffId, date, appointments, initialAppointment, startHour]);

  const timeSlotOptions = useMemo(() => {
    return timeSlots.map((slot) => ({
      value: slot,
      label: slot,
      disabled: isTimeSlotConflicting(slot) || isTimeSlotInPast(slot),
    }));
  }, [timeSlots, isTimeSlotConflicting, isTimeSlotInPast]);

  const teamMemberOptions = useMemo(() => {
    const sorted = [...teamMembers].sort((a, b) => {
      const aIsAdmin = a.isAdmin === true;
      const bIsAdmin = b.isAdmin === true;
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;
      
      const nameA = (a.name || 'Unnamed').toLowerCase();
      const nameB = (b.name || 'Unnamed').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    return sorted.map((member) => ({
      value: member.id,
      label: member.name || 'Unnamed',
    }));
  }, [teamMembers]);

  const clientOptions = useMemo(() => {
    return clients.map((client) => ({
      value: client.id,
      label: client.company ? `${client.name} (${client.company})` : client.name,
    }));
  }, [clients]);

  const availableServices = useMemo(() => {
    if (!staffId) return [];
    return services.filter((service) => {
      const assignedIds = service.assignedTeamMemberIds || [];
      return assignedIds.includes(staffId);
    });
  }, [services, staffId]);

  const serviceNames = useMemo(() => {
    return availableServices.map((service) => service.name);
  }, [availableServices]);

  useEffect(() => {
    if (initialAppointment) {
      setDate(initialAppointment.date || '');
      setLabel(initialAppointment.label || '');
      setSelectedServices(initialAppointment.services || []);
      setClientId(initialAppointment.clientId || '');
    } else {
      let defaultDate = selectedDate
        ? selectedDate.toISOString().split('T')[0]
        : todayDateString;
      
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

  useEffect(() => {
    if (!initialAppointment && staffId) {
      const validServices = selectedServices.filter((serviceName) => {
        const service = services.find((s) => s.name === serviceName);
        return service?.assignedTeamMemberIds?.includes(staffId);
      });
      if (validServices.length !== selectedServices.length) {
        setSelectedServices(validServices);
      }
    }
  }, [staffId, services, initialAppointment]);

  useEffect(() => {
    if (staffRestrictedToId) {
      setStaffId(staffRestrictedToId);
    }
  }, [staffRestrictedToId]);

  useEffect(() => {
    if (!initialAppointment) {
      if (date) {
        const currentDateTime = getCurrentDateTimeInTimezone();
        if (date < currentDateTime.date) {
          setDate(todayDateString);
          setStartTime('');
          setEndTime('');
          return;
        }
      }

      if (startTime) {
        const selectedSlot = timeSlotOptions.find((opt) => opt.value === startTime);
        if (selectedSlot && selectedSlot.disabled) {
          setStartTime('');
          setEndTime('');
        }
      }
    }
  }, [staffId, date, timeSlotOptions, todayDateString, getCurrentDateTimeInTimezone]);

  useEffect(() => {
    if (!initialAppointment) {
      setStaffId(staffRestrictedToId || '');
      setStartTime('');
      setEndTime('');
      return;
    }

    if (teamMemberOptions.length === 0 || timeSlotOptions.length === 0) {
      return;
    }

    const staffOpt = teamMemberOptions.find(
      (opt) => String(opt.value) === String(initialAppointment.staffId)
    );
    if (staffRestrictedToId) {
      setStaffId(staffRestrictedToId);
    } else if (staffOpt) {
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
  }, [initialAppointment?.id]);

  const validate = () => {
    const newErrors = {};
    const effectiveStaffId = staffRestrictedToId || staffId;
    if (!effectiveStaffId) {
      newErrors.staffId = 'Please select a team member';
    }

    if (!date) {
      newErrors.date = 'Please select a date';
    } else {
      const todayLocal = getCurrentDateTimeLocal().date;
      if (date < todayLocal) {
        newErrors.date = 'Cannot schedule appointments in the past';
      }
    }

    if (!startTime) {
      newErrors.startTime = 'Please select a start time';
    } else if (date === todayDateStringLocal) {
      const currentDateTime = getCurrentDateTimeLocal();
      const parts = currentDateTime.time.split(':').map(Number);
      const currentHours = parts[0] ?? 0;
      const currentMinutes = parts[1] ?? 0;
      
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


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const appointmentData = {
      id: initialAppointment?.id || `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      staffId: staffRestrictedToId || staffId,
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

  const effectiveStaffId = staffRestrictedToId || staffId;
  const isTeamMemberView = !!staffRestrictedToId;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {/* Row 1: Team Member (admin only) or Date + Start + End in 3 columns */}
      <div className={isTeamMemberView ? 'grid grid-cols-1 sm:grid-cols-3 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4'}>
        {!staffRestrictedToId ? (
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
        ) : null}

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

      {/* Row 2: Services, Client, Notes — 3 columns for team members to avoid empty space */}
      {isTeamMemberView ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Client
            </label>
            <div className="flex gap-2">
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
              {onClientAdd && (
                <PrimaryButton
                  type="button"
                  onClick={() => setShowClientDrawer(true)}
                  className="whitespace-nowrap flex-shrink-0"
                >
                  Add
                </PrimaryButton>
              )}
            </div>
            {errors.client && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.client}</p>}
          </div>
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
        </div>
      ) : (
        <>
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
        </>
      )}

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
