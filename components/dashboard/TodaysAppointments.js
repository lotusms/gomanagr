import { buildTimeSlots, parseHour, parseTimeToSlotIndex } from './scheduleTimeUtils';
import { formatDate } from '@/utils/dateTimeFormatters';
import Tooltip from '@/components/ui/Tooltip';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { HiCalendar } from 'react-icons/hi';

// Staff rows come from dashboard (userAccount.teamMembers); use empty array until real team is added
// Appointments use "HH:00" or "HH:30" for half-hour slot math

/**
 * Filter appointments for today
 * @param {Array} appointments - Array of appointment objects
 * @param {string} todayKey - Date key in format YYYY-MM-DD
 * @param {number} startHour - Business hours start hour
 * @returns {Array} Appointments for today with startSlot and endSlot
 */
function getAppointmentsForToday(appointments, todayKey, startHour) {
  if (!appointments || !Array.isArray(appointments)) return [];
  
  return appointments
    .filter((apt) => {
      // Handle date string (YYYY-MM-DD) or Date object
      let appointmentKey;
      if (typeof apt.date === 'string' && apt.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // If it's already a date string in YYYY-MM-DD format, use it directly
        appointmentKey = apt.date;
      } else {
        // If it's a Date object or ISO string, convert to YYYY-MM-DD
        const appointmentDate = new Date(apt.date);
        appointmentKey = 
          appointmentDate.getFullYear() +
          '-' +
          String(appointmentDate.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(appointmentDate.getDate()).padStart(2, '0');
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
}) {
  const staff = staffProp || [];
  const timeSlots = buildTimeSlots(businessHoursStart, businessHoursEnd, timeFormat);
  const startHour = parseHour(businessHoursStart);
  
  // Get today's date in user's timezone
  const todayInTimezone = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  const todayKey = todayInTimezone; // Already in YYYY-MM-DD format
  
  const appointmentsForToday = getAppointmentsForToday(appointments, todayKey, startHour);
  // Format today's date according to user's preference
  const todayLabel = formatDate(todayInTimezone, dateFormat, timezone);

  // Filter staff to only show those with appointments today
  const staffWithAppointments = staff.filter((staffRow) => {
    const staffAppointments = appointmentsForToday.filter((a) => a.staffId === staffRow.id);
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
                    Staff
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
                  const staffAppointments = appointmentsForToday.filter((a) => a.staffId === staffRow.id);
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
                          const timeRangeText =
                            timeSlots[appointment.startSlot] +
                            (appointment.endSlot < timeSlots.length
                              ? ` – ${timeSlots[appointment.endSlot]}`
                              : '');
                          
                          // Get client name
                          const client = appointment.clientId 
                            ? clients.find(c => c.id === appointment.clientId)
                            : null;
                          const clientName = client ? client.name : '';
                          
                          // Get service names (first service or empty)
                          const serviceNames = appointment.services || [];
                          const firstService = serviceNames.length > 0 ? serviceNames[0] : '';
                          
                          // Build display text: "Client Name - Service" or just "Client Name" or just "Service"
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
                          
                          const tooltipContent = `${displayText}\n${timeRangeText}`;
                          return (
                            <td
                              key={colIndex}
                              colSpan={span}
                              className="min-w-0 py-1 px-0.5 align-top border-b border-r border-gray-100 dark:border-gray-700 overflow-hidden"
                            >
                              <Tooltip content={tooltipContent}>
                                <div className="bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 text-primary-800 dark:text-primary-200 rounded px-1.5 py-1 font-medium min-w-0 overflow-hidden leading-tight">
                                  <span className="truncate block">
                                    {displayText}
                                  </span>
                                  <span className="truncate block text-primary-600 dark:text-primary-300 mt-px">
                                    {timeSlots[appointment.startSlot]}
                                    {appointment.endSlot < timeSlots.length
                                      ? ` – ${timeSlots[appointment.endSlot]}`
                                      : ''}
                                  </span>
                                </div>
                              </Tooltip>
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
