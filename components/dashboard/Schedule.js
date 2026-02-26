import { useState, useMemo } from 'react';
import { HiChevronLeft, HiChevronRight, HiCalendar } from 'react-icons/hi';
import { buildTimeSlots, parseHour, parseTimeToSlotIndex } from './scheduleTimeUtils';
import { formatTime, formatDate } from '@/utils/dateTimeFormatters';
import Tooltip from '@/components/ui/Tooltip';
import AppointmentPopover from './AppointmentPopover';

function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDays(weekStart) {
  const days = [];
  const start = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateKey(d) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/**
 * Process appointments for the week view
 * @param {Array} appointments - Array of appointment objects from Firestore
 * @param {Array} weekDays - Array of Date objects for the week
 * @param {number} startHour - Business hours start hour
 * @returns {Array} Processed appointments with dayIndex, startSlot, endSlot
 */
function processAppointmentsForWeek(appointments, weekDays, startHour) {
  if (!appointments || !Array.isArray(appointments)) return [];

  return appointments
    .map((apt) => {
      let appointmentDateKey;
      if (typeof apt.date === 'string') {
        appointmentDateKey = apt.date;
      } else {
        const date = new Date(apt.date);
        appointmentDateKey = toDateKey(date);
      }
      
      const dayIndex = weekDays.findIndex((d) => toDateKey(d) === appointmentDateKey);
      
      if (dayIndex === -1) return null; // Appointment not in this week

      const startSlot = parseTimeToSlotIndex(apt.start, startHour);
      const endSlot = parseTimeToSlotIndex(apt.end, startHour);

      return {
        ...apt,
        dayIndex,
        startSlot,
        endSlot,
        color: 'bg-primary-100 dark:bg-primary-900/40 border-primary-200 dark:border-primary-600 text-primary-800 dark:text-primary-200',
      };
    })
    .filter(Boolean);
}

export default function Schedule({
  businessHoursStart = '08:00',
  businessHoursEnd = '18:00',
  timeFormat = '24h',
  dateFormat = 'MM/DD/YYYY',
  timezone = 'UTC',
  appointments = [],
  teamMembers = [],
  clients = [],
  services = [],
  onAppointmentClick,
  onAppointmentDelete,
}) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const weekDays = getWeekDays(weekStart);
  const timeSlots = buildTimeSlots(businessHoursStart, businessHoursEnd, timeFormat);
  const startHour = parseHour(businessHoursStart);
  
  const processedAppointments = useMemo(() => {
    return processAppointmentsForWeek(appointments, weekDays, startHour);
  }, [appointments, weekDays, startHour]);

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {weekDays[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: timezone })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setWeekStart((prev) => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() - 7);
                  return d;
                })
              }
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Previous week"
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(getWeekStart(today))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30"
            >
              <HiCalendar className="w-4 h-4" />
              Today
            </button>
            <button
              type="button"
              onClick={() =>
                setWeekStart((prev) => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() + 7);
                  return d;
                })
              }
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Next week"
            >
              <HiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="w-14 p-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700" />
                {weekDays.map((d, colIndex) => {
                  const isToday = toDateKey(d) === todayKey;
                  return (
                    <th
                      key={toDateKey(d)}
                      className={`relative min-w-0 p-2 text-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 ${
                        colIndex > 0 ? 'border-r dark:border-gray-700' : ''
                      } ${isToday ? 'bg-primary-50/50 dark:bg-primary-900/30' : ''}`}
                    >
                      <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        {d.toLocaleDateString('en-US', { weekday: 'short', timeZone: timezone })}
                      </span>
                      <span
                        className={`inline-flex items-center justify-center mt-1 w-8 h-8 rounded-full text-sm font-semibold ${
                          isToday ? 'bg-primary-500 text-white ring-2 ring-primary-200 dark:ring-primary-800' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {d.toLocaleDateString('en-US', { day: 'numeric', timeZone: timezone })}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, rowIndex) => (
                <tr key={slot}>
                  {/* Time slot column */}
                  <td className="w-14 min-w-0 p-1.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 align-center overflow-hidden">
                    <Tooltip content={slot} placement="bottom">
                      <span className="truncate block">{slot}</span>
                    </Tooltip>
                  </td>

                  {/* Week days columns */}
                  {weekDays.map((d, colIndex) => {
                    const isToday = toDateKey(d) === todayKey;
                    const appointment = processedAppointments.find(
                      (a) => a.dayIndex === colIndex && a.startSlot === rowIndex
                    );
                    const covered = processedAppointments.some(
                      (a) =>
                        a.dayIndex === colIndex && rowIndex > a.startSlot && rowIndex < a.endSlot
                    );
                    if (covered) return null;
                    if (appointment) {
                      const timeRange = `${formatTime(appointment.start, timeFormat)} – ${formatTime(appointment.end, timeFormat)}`;
                      const displayTitle = (appointment.title || '').trim() || 'Appointment';

                      return (
                        <td
                          key={toDateKey(d)}
                          rowSpan={appointment.endSlot - appointment.startSlot}
                          className={`relative align-top p-1 min-w-0 overflow-hidden ${appointment.color} dark:bg-primary-900/40 dark:border-primary-600 dark:text-primary-200 border-2 border-primary-600/50 dark:border-primary-500/50 cursor-pointer hover:opacity-80 transition-opacity`}
                          onClick={() => onAppointmentClick && onAppointmentClick(appointment)}
                        >
                          <AppointmentPopover
                            appointment={appointment}
                            teamMembers={teamMembers}
                            clients={clients}
                            timeFormat={timeFormat}
                            onOpenEdit={onAppointmentClick}
                            onDelete={onAppointmentDelete}
                          >
                            <span className="text-xs font-medium truncate block">{displayTitle}</span>
                            <span className="text-xs text-gray-600 dark:text-primary-300 truncate block mt-0.5">
                              {timeRange}
                            </span>
                          </AppointmentPopover>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={toDateKey(d)}
                        className={`border border-gray-100 dark:border-gray-700 align-top min-w-0 ${
                          isToday ? 'bg-primary-50/30 dark:bg-primary-900/20' : ''
                        }`}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
