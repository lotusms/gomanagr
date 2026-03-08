import { useEffect, useState } from 'react';
import { buildTimeSlots, parseHour, parseTimeToSlotIndex } from './scheduleTimeUtils';
import { formatDate } from '@/utils/dateTimeFormatters';
import Tooltip from '@/components/ui/Tooltip';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import AppointmentPopover from '@/components/dashboard/AppointmentPopover';
import { getTermForIndustry } from '@/components/clients/clientProfileConstants';

/**
 * @param {Array} appointments - Array of appointment objects
 * @param {string} todayKey - Date key in format YYYY-MM-DD (in same timezone as appointmentKey)
 * @param {number} startHour - Business hours start hour
 * @param {string} timezone - IANA timezone for resolving appointment date (e.g. 'America/Los_Angeles')
 * @returns {Array} Appointments for today with startSlot and endSlot
 */
function getAppointmentsForToday(appointments, todayKey, startHour, timezone = 'UTC') {
  if (!appointments || !Array.isArray(appointments)) return [];

  return appointments
    .filter((apt) => {
      let appointmentKey;
      if (typeof apt.date === 'string' && apt.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const d = new Date(apt.date + 'T12:00:00');
        appointmentKey = d.toLocaleDateString('en-CA', { timeZone: timezone });
      } else {
        const d = new Date(apt.date);
        appointmentKey = d.toLocaleDateString('en-CA', { timeZone: timezone });
      }
      return appointmentKey === todayKey;
    })
    .map((a) => ({
      ...a,
      startSlot: parseTimeToSlotIndex(a.start, startHour),
      endSlot: parseTimeToSlotIndex(a.end, startHour),
    }));
}

export default function TodaysAppointments({
  businessHoursStart = '08:00',
  businessHoursEnd = '18:00',
  timeFormat = '24h',
  dateFormat = 'MM/DD/YYYY',
  timezone = 'UTC',
  staff: staffProp,
  appointments = [],
  clients = [],
  services = [],
  teamMembers: teamMembersProp,
  onAppointmentClick,
  onAppointmentDelete,
  industry = null,
  isTeamMember = false,
  currentUserStaffId = null,
}) {
  const staff = staffProp || [];
  const teamMembers = teamMembersProp ?? staff;
  const teamOrStaffLabel = getTermForIndustry(industry, 'team') || 'Staff';
  const timeSlots = buildTimeSlots(businessHoursStart, businessHoursEnd, timeFormat);
  const startHour = parseHour(businessHoursStart);

  // When timezone is UTC (default before prefs load), use browser's local date so we don't show "tomorrow"
  const localTz = typeof Intl !== 'undefined' && Intl.DateTimeFormat?.().resolvedOptions?.().timeZone ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
  const effectiveTimezone = timezone && timezone !== 'UTC' ? timezone : localTz;
  const getTodayKey = () =>
    new Date().toLocaleDateString('en-CA', { timeZone: effectiveTimezone });

  const [todayResolved, setTodayResolved] = useState(null);
  useEffect(() => {
    const todayInTimezone = getTodayKey();
    setTodayResolved({
      todayKey: todayInTimezone,
      todayLabel: formatDate(todayInTimezone, dateFormat, effectiveTimezone),
    });
  }, [timezone, dateFormat]);

  const todayKey = todayResolved?.todayKey ?? getTodayKey();
  const todayLabel = todayResolved?.todayLabel ?? '';
  const appointmentsForToday = getAppointmentsForToday(appointments, todayKey, startHour, effectiveTimezone);
  const appointmentMatchesStaff = (apt, staffId) =>
    (Array.isArray(apt.staffIds) && apt.staffIds.some((id) => String(id) === String(staffId))) ||
    String(apt.staffId) === String(staffId);
  const staffWithAppointments = staff.filter((staffRow) => {
    const staffAppointments = appointmentsForToday.filter((a) => appointmentMatchesStaff(a, staffRow.id));
    return staffAppointments.length > 0;
  });

  const hasAppointments = staffWithAppointments.length > 0;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Today&apos;s appointments</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{todayLabel}</p>
      {hasAppointments ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse min-w-[500px] text-xs">
              <thead>
                <tr>
                  <th className="w-36 py-1.5 px-2 text-left font-medium uppercase tracking-wide border-b border-r border-gray-200 dark:border-gray-600 text-white bg-secondary-500">
                    {teamOrStaffLabel}
                  </th>
                  {timeSlots.map((slot) => (
                    <th
                      key={slot}
                      className="min-w-0 py-1.5 px-1 text-center font-medium text-white uppercase tracking-wide border-b border-gray-200 dark:border-gray-600 bg-secondary-500 overflow-hidden"
                    >
                      <Tooltip content={slot} placement="bottom">
                        <span className="truncate block">{slot}</span>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffWithAppointments.map((staffRow) => {
                  const staffAppointments = appointmentsForToday.filter((a) => appointmentMatchesStaff(a, staffRow.id));
                  return (
                    <tr key={staffRow.id}>
                      <td className="w-36 py-1 px-2 border-r border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 font-medium text-gray-900 dark:text-white leading-tight">
                        <div className="flex items-center gap-2">
                          <Avatar 
                            src={staffRow.pictureUrl} 
                            name={staffRow.name} 
                            size="sm" 
                            className="flex-shrink-0"
                          />
                          <span className="truncate">{staffRow.name}</span>
                        </div>
                      </td>
                      {timeSlots.map((_, colIndex) => {
                        const appointment = staffAppointments.find(
                          (a) => colIndex >= a.startSlot && colIndex < a.endSlot
                        );
                        const isStart = appointment && colIndex === appointment.startSlot;
                        if (appointment && !isStart) return null;
                        if (isStart) {
                          const span = appointment.endSlot - appointment.startSlot;
                          const serviceNames = appointment.services || [];
                          const firstService = serviceNames.length > 0 ? serviceNames[0] : '';
                          const client = appointment.clientId
                            ? clients.find(c => c.id === appointment.clientId)
                            : null;
                          const clientName = client ? client.name : '';
                          let displayText = '';
                          if (clientName && firstService) {
                            displayText = `${clientName} - ${firstService}`;
                          } else if (clientName) {
                            displayText = clientName;
                          } else if (firstService) {
                            displayText = firstService;
                          } else {
                            displayText = 'Appointment';
                          }
                          const isGroup =
                            Array.isArray(appointment.staffIds) && appointment.staffIds.length > 1;
                          const isOwn =
                            currentUserStaffId &&
                            ((Array.isArray(appointment.staffIds) &&
                              appointment.staffIds.some((id) => String(id) === String(currentUserStaffId))) ||
                              String(appointment.staffId) === String(currentUserStaffId));
                          const canEdit = !isTeamMember || (isOwn && !isGroup);
                          const canDelete = !isTeamMember || (isOwn && !isGroup);
                          return (
                            <td
                              key={colIndex}
                              colSpan={span}
                              className="min-w-0 py-1 px-0.5 align-top border-b border-r border-gray-100 dark:border-gray-700 overflow-hidden"
                            >
                              <AppointmentPopover
                                appointment={appointment}
                                teamMembers={teamMembers}
                                clients={clients}
                                timeFormat={timeFormat}
                                onOpenEdit={onAppointmentClick}
                                onDelete={onAppointmentDelete}
                                canEdit={canEdit}
                                canDelete={canDelete}
                                industry={industry}
                              >
                                <div className="block rounded px-1.5 py-1 font-medium min-w-0 overflow-hidden leading-tight bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 text-primary-800 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-800/50 cursor-pointer transition-colors">
                                  <span className="truncate block">{displayText}</span>
                                  <span className="truncate block text-primary-600 dark:text-primary-300 mt-px">
                                    {timeSlots[appointment.startSlot]}
                                    {appointment.endSlot < timeSlots.length
                                      ? ` – ${timeSlots[appointment.endSlot]}`
                                      : ''}
                                  </span>
                                </div>
                              </AppointmentPopover>
                            </td>
                          );
                        }
                        return (
                          <td
                            key={colIndex}
                            className="min-w-0 py-1 border-b border-r border-gray-100 dark:border-gray-700 align-top"
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState type="appointments" />
      )}
    </div>
  );
}
