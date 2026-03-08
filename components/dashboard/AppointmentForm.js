import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import DateField from '@/components/ui/DateField';
import TimeField from '@/components/ui/TimeField';
import { Dropdown, SearchableMultiselect } from '@/components/ui';
import { useCancelWithConfirm } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import AppointmentRecurrence, { defaultRecurrence } from '@/components/dashboard/AppointmentRecurrence';
import ServiceSelector from '@/components/dashboard/ServiceSelector';
import ClientSelector from '@/components/dashboard/ClientSelector';
import { buildTimeSlots, parseHour, parseTimeToSlotIndex } from './scheduleTimeUtils';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

/**
 * Appointment Form Component
 * @param {Object} props
 * @param {Array} props.teamMembers - Array of team members
 * @param {string} [props.industry] - Organization industry for dynamic labels (e.g. "Staff Member(s)" for Healthcare)
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
 * @param {Function} [props.onClientAdd] - Callback when a new client is added (persist immediately). If not provided, clients added in drawer are local until appointment save.
 * @param {Function} props.onSubmit - Callback when form is submitted (receives appointmentData with optional pendingClients)
 * @param {Function} props.onCancel - Callback when form is cancelled
 * @param {Function} props.onDelete - Callback when delete is requested (only shown when editing)
 * @param {Function} [props.onServiceCreated] - Callback when a new service is created from the drawer (receives updated services array)
 * @param {Function} [props.onNestedDrawerChange] - (open: boolean) => void — called when Add Service drawer opens/closes so parent drawer can avoid closing on overlay click
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
  onServiceCreated,
  onNestedDrawerChange,
  saving = false,
  staffRestrictedToId = null,
  industry = null,
}) {
  const teamMemberTerm = getTermForIndustry(industry, 'teamMember');
  const teamMemberSingular = getTermSingular(teamMemberTerm);
  const teamMemberSingularLower = teamMemberSingular.toLowerCase();
  const clientTermPlural = getTermForIndustry(industry, 'client');
  const clientTermSingular = getTermSingular(clientTermPlural) || 'Client';
  const clientTermSingularLower = clientTermSingular.toLowerCase();
  const startHour = parseHour(businessHoursStart);
  const endHour = parseHour(businessHoursEnd);
  const timeSlots = buildTimeSlots(businessHoursStart, businessHoursEnd, timeFormat);

  const [title, setTitle] = useState('');
  const [staffIds, setStaffIds] = useState(() => (staffRestrictedToId ? [staffRestrictedToId] : []));
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [label, setLabel] = useState('');
  const [clientId, setClientId] = useState('');
  const [pendingClients, setPendingClients] = useState([]);
  const [recurrence, setRecurrence] = useState(() => defaultRecurrence());
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const markDirty = useCallback(() => setHasChanges(true), []);
  const { handleCancel, discardDialog } = useCancelWithConfirm(onCancel, hasChanges);
  const lastTeamMemberSelectValueRef = useRef([]);

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

  const effectiveStaffIds = useMemo(
    () => (staffRestrictedToId ? [staffRestrictedToId] : staffIds),
    [staffRestrictedToId, staffIds]
  );

  const isTimeSlotConflicting = useMemo(() => {
    return (timeSlot) => {
      if (!date || effectiveStaffIds.length === 0) return false;

      const slotIndex = parseTimeToSlotIndex(timeSlot, startHour);
      for (const sid of effectiveStaffIds) {
        const conflictingAppointments = appointments.filter((apt) => {
          if (initialAppointment && apt.id === initialAppointment.id) return false;
          const aptStaffMatch = (apt.staffIds && apt.staffIds.some((id) => String(id) === String(sid))) || String(apt.staffId) === String(sid);
          if (!aptStaffMatch) return false;
          let appointmentDateKey;
          if (typeof apt.date === 'string') {
            appointmentDateKey = apt.date;
          } else {
            const aptDate = new Date(apt.date);
            appointmentDateKey = aptDate.toISOString().split('T')[0];
          }
          return appointmentDateKey === date;
        });
        const hasConflict = conflictingAppointments.some((apt) => {
          const aptStartSlot = parseTimeToSlotIndex(apt.start, startHour);
          const aptEndSlot = parseTimeToSlotIndex(apt.end, startHour);
          return slotIndex >= aptStartSlot && slotIndex < aptEndSlot;
        });
        if (hasConflict) return true;
      }
      return false;
    };
  }, [effectiveStaffIds, date, appointments, initialAppointment, startHour]);

  const timeSlotOptions = useMemo(() => {
    return timeSlots.map((slot) => ({
      value: slot,
      label: slot,
      disabled: isTimeSlotConflicting(slot) || isTimeSlotInPast(slot),
    }));
  }, [timeSlots, isTimeSlotConflicting, isTimeSlotInPast]);

  const ALL_MEMBERS_VALUE = '__all__';

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
    
    const memberOpts = sorted.map((member) => ({
      value: member.id,
      label: member.name || 'Unnamed',
    }));
    if (memberOpts.length <= 1) return memberOpts;
    return [{ value: ALL_MEMBERS_VALUE, label: 'All Members' }, ...memberOpts];
  }, [teamMembers]);

  const availableServices = useMemo(() => {
    if (!Array.isArray(services)) return [];
    if (effectiveStaffIds.length === 0) return services;
    return services.filter((service) => {
      const assignedIds = service.assignedTeamMemberIds || [];
      return effectiveStaffIds.some((sid) => assignedIds.includes(sid));
    });
  }, [services, effectiveStaffIds]);


  useEffect(() => {
    if (initialAppointment) {
      setTitle(initialAppointment.title || '');
      setDate(initialAppointment.date || '');
      setLabel(initialAppointment.label || '');
      const names = initialAppointment.services || [];
      const ids = (services || []).filter((s) => names.includes(s.name)).map((s) => s.id);
      setSelectedServiceIds(ids);
      setClientId(initialAppointment.clientId || '');
      const initialStaffIds = Array.isArray(initialAppointment.staffIds) && initialAppointment.staffIds.length > 0
        ? initialAppointment.staffIds.map(String)
        : (initialAppointment.staffId ? [String(initialAppointment.staffId)] : []);
      setStaffIds(staffRestrictedToId ? [staffRestrictedToId] : initialStaffIds);
      if (initialAppointment.recurrence && typeof initialAppointment.recurrence === 'object') {
        setRecurrence((prev) => ({ ...defaultRecurrence(), ...prev, ...initialAppointment.recurrence }));
      }
    } else {
      let defaultDate = selectedDate
        ? selectedDate.toISOString().split('T')[0]
        : todayDateString;
      
      const currentDateTime = getCurrentDateTimeInTimezone();
      if (defaultDate < currentDateTime.date) {
        defaultDate = todayDateString;
      }
      
      setDate(defaultDate);
      setTitle('');
      setStaffIds(staffRestrictedToId ? [staffRestrictedToId] : []);
      setStartTime('');
      setEndTime('');
      setSelectedServiceIds([]);
      setLabel('');
      setClientId('');
      setRecurrence(defaultRecurrence());
    }
    setErrors({});
  }, [initialAppointment, selectedDate, todayDateString, getCurrentDateTimeInTimezone, staffRestrictedToId]);

  useEffect(() => {
    if (!initialAppointment && effectiveStaffIds.length > 0 && Array.isArray(services)) {
      const validIds = selectedServiceIds.filter((id) => {
        const service = services.find((s) => s.id === id);
        const assigned = service?.assignedTeamMemberIds || [];
        return effectiveStaffIds.some((sid) => assigned.includes(sid));
      });
      if (validIds.length !== selectedServiceIds.length) {
        setSelectedServiceIds(validIds);
      }
    }
  }, [effectiveStaffIds, services, initialAppointment]);

  useEffect(() => {
    if (staffRestrictedToId) {
      setStaffIds([staffRestrictedToId]);
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
  }, [effectiveStaffIds, date, timeSlotOptions, todayDateString, getCurrentDateTimeInTimezone]);

  useEffect(() => {
    if (!initialAppointment) {
      setStaffIds(staffRestrictedToId ? [staffRestrictedToId] : []);
      setStartTime('');
      setEndTime('');
      return;
    }

    if (teamMemberOptions.length === 0 || timeSlotOptions.length === 0) {
      return;
    }

    const initialStaffIds = Array.isArray(initialAppointment.staffIds) && initialAppointment.staffIds.length > 0
      ? initialAppointment.staffIds.map(String)
      : (initialAppointment.staffId ? [String(initialAppointment.staffId)] : []);
    if (staffRestrictedToId) {
      setStaffIds([staffRestrictedToId]);
    } else if (initialStaffIds.length > 0) {
      const valid = initialStaffIds.filter((id) => teamMemberOptions.some((o) => String(o.value) === id));
      setStaffIds(valid.length > 0 ? valid : initialStaffIds);
    } else {
      setStaffIds([]);
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
    if (effectiveStaffIds.length === 0) {
      newErrors.staffId = `Please select at least one ${teamMemberSingularLower}`;
    }

    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) {
      newErrors.title = 'Appointment title is required';
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

    if (recurrence?.isRecurring) {
      if (!recurrence.recurrenceStart?.trim()) {
        newErrors.recurrence = 'Recurrence start date is required';
      } else if (!recurrence.noEndDate && (recurrence.recurrenceEnd == null || recurrence.recurrenceEnd === '')) {
        newErrors.recurrence = 'Recurrence end date is required when "No end date" is unchecked';
      } else if (!recurrence.noEndDate && recurrence.recurrenceStart && recurrence.recurrenceEnd && recurrence.recurrenceEnd < recurrence.recurrenceStart) {
        newErrors.recurrence = 'Recurrence end must be on or after start date';
      } else if (recurrence.frequency === 'specific_days' && (!Array.isArray(recurrence.specificDays) || recurrence.specificDays.length === 0)) {
        newErrors.recurrence = 'Please select at least one day of the week';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const appointmentData = {
      id: initialAppointment?.id || `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      staffIds: effectiveStaffIds.length > 0 ? [...effectiveStaffIds] : undefined,
      staffId: effectiveStaffIds[0] || undefined,
      title: title.trim() || undefined,
      date,
      start: startTime,
      end: endTime,
      services: (services || [])
        .filter((s) => selectedServiceIds.includes(s.id))
        .map((s) => s.name),
      label: label.trim() || undefined,
      clientId: clientId || undefined,
      createdAt: initialAppointment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recurrence: recurrence?.isRecurring ? { ...recurrence } : undefined,
      pendingClients: pendingClients.length > 0 ? pendingClients : undefined,
    };

    onSubmit(appointmentData);
  };

  const isTeamMemberView = !!staffRestrictedToId;

  return (
    <form onSubmit={handleSubmit} onInput={markDirty} className="space-y-6 p-6">

      {/* Row 1: Title + Staff/Team Member (super admins and admins only) + Date in 3 columns */}
      <div className={isTeamMemberView ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'}>
        <div>
          <InputField
            id="appointment-title"
            type="text"
            label="Appointment title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((prev) => ({ ...prev, title: '' }));
            }}
            placeholder="e.g., Client consultation, Team meeting..."
            error={errors.title}
            variant="light"
          />
        </div>
        {!staffRestrictedToId ? (
          <div>
            {(() => {
              const teamMemberSelectValue =
                teamMembers.length > 1 && staffIds.length === teamMembers.length
                  ? [ALL_MEMBERS_VALUE, ...staffIds]
                  : staffIds;
              lastTeamMemberSelectValueRef.current = teamMemberSelectValue;
              const allMemberIds = teamMemberOptions
                .filter((o) => o.value !== ALL_MEMBERS_VALUE)
                .map((o) => o.value);
              return (
                <SearchableMultiselect
                  id="staffIds"
                  label={teamMembers.length > 1 ? `${teamMemberTerm}` : teamMemberSingular}
                  options={teamMemberOptions}
                  value={teamMemberSelectValue}
                  onChange={(ids) => {
                    const next = ids || [];
                    const hadAllSelected = lastTeamMemberSelectValueRef.current.includes(ALL_MEMBERS_VALUE);
                    const withoutAll = next.filter((v) => v !== ALL_MEMBERS_VALUE);
                    if (next.includes(ALL_MEMBERS_VALUE)) {
                      if (next.length === 1 || next.length === allMemberIds.length + 1) {
                        setStaffIds(allMemberIds);
                      } else {
                        setStaffIds(withoutAll);
                      }
                    } else if (hadAllSelected && !next.includes(ALL_MEMBERS_VALUE)) {
                      setStaffIds([]);
                    } else {
                      setStaffIds(withoutAll);
                    }
                    setErrors((prev) => ({ ...prev, staffId: '' }));
                  }}
                  placeholder={`Select ${teamMemberSingularLower}(s)...`}
                  required
                  error={errors.staffId}
                />
              );
            })()}
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
      </div>
      
      {/* Row 2: Start + End Time in 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Recurrence */}
      <AppointmentRecurrence
        value={recurrence}
        onChange={(v) => {
          setRecurrence(v);
          setErrors((prev) => ({ ...prev, recurrence: '' }));
        }}
        minDate={date || todayDateString}
        timezone={timezone}
        dateFormat={dateFormat}
        disabled={saving}
      />
      {errors.recurrence && <p className="text-sm text-red-600 dark:text-red-400">{errors.recurrence}</p>}

      {/* Row 3: Services + Client in 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <ServiceSelector
            services={services}
            displayServices={availableServices}
            value={selectedServiceIds}
            onChange={(ids) => {
              setSelectedServiceIds(ids);
              setErrors((prev) => ({ ...prev, services: '' }));
            }}
            onServiceCreated={onServiceCreated}
            onNestedDrawerChange={onNestedDrawerChange}
            teamMembers={teamMembers}
            industry={industry}
            multiple={false}
            preselectedTeamMemberIds={effectiveStaffIds}
            label="Service"
            disabled={saving}
            dropdownPlaceholder="Select service..."
            addButtonLabel="Add"
            drawerTitle="Add Service"
            drawerWidth="75vw"
          />
          {errors.services && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.services}</p>}
        </div>
        <div>
          <ClientSelector
            clients={[...(clients || []), ...pendingClients]}
            value={clientId}
            onChange={(id) => {
              setClientId(id ?? '');
              setErrors((prev) => ({ ...prev, client: '' }));
            }}
            onClientAdd={onClientAdd}
            onAddClientLocally={
              !onClientAdd
                ? (clientWithId) => {
                    setPendingClients((prev) => [...prev, clientWithId]);
                    setClientId(clientWithId.id ?? '');
                    setErrors((prev) => ({ ...prev, client: '' }));
                  }
                : undefined
            }
            label={clientTermSingular}
            disabled={saving}
            dropdownPlaceholder={`Select ${clientTermSingularLower}...`}
            addButtonLabel="Add"
            drawerTitle={`Add ${clientTermSingular}`}
            unnamedLabel={`Unnamed ${clientTermSingularLower}`}
            industry={industry}
            onNestedDrawerChange={onNestedDrawerChange}
          />
          {errors.client && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.client}</p>}
        </div>
      </div>
      
      {/* Row 4: Notes in 1 column */}
      <div className="w-full">
        <TextareaField
          id="label"
          label="Notes"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setErrors((prev) => ({ ...prev, label: '' }));
          }}
          placeholder="e.g., Client consultation, Team meeting..."
          error={errors.label}
          rows={3}
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
          <SecondaryButton type="button" onClick={handleCancel} disabled={saving}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : initialAppointment ? 'Update Appointment' : 'Create Appointment'}
          </PrimaryButton>
        </div>
      </div>
      {discardDialog}
    </form>
  );
}
