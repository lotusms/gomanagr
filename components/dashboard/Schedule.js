import { useState } from 'react';
import { HiChevronLeft, HiChevronRight, HiCalendar } from 'react-icons/hi';
import { buildTimeSlots } from './scheduleTimeUtils';
import Tooltip from '@/components/ui/Tooltip';

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

// Placeholder uses half-hour slot indices (e.g. 20 slots for 8:00–18:00)
function getPlaceholderAppointments(weekDays, todayKey, slotCount) {
  const appointments = [];
  const todayIndex = weekDays.findIndex((d) => toDateKey(d) === todayKey);
  if (todayIndex === -1 || slotCount < 4) return appointments;
  const s1 = Math.min(4, slotCount - 4);
  const e1 = Math.min(s1 + 4, slotCount);
  appointments.push({
    dayIndex: todayIndex,
    startSlot: s1,
    endSlot: e1,
    label: 'Client call',
    color: 'bg-primary-100 border-primary-200 text-primary-800',
  });
  const s2 = Math.min(10, slotCount - 4);
  const e2 = Math.min(s2 + 4, slotCount);
  if (s2 < e2) {
    appointments.push({
      dayIndex: todayIndex,
      startSlot: s2,
      endSlot: e2,
      label: 'Team sync',
      color: 'bg-amber-50 border-amber-200 text-amber-800',
    });
  }
  return appointments;
}

export default function Schedule({
  businessHoursStart = '08:00',
  businessHoursEnd = '18:00',
  timeFormat = '24h',
}) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const weekDays = getWeekDays(weekStart);
  const timeSlots = buildTimeSlots(businessHoursStart, businessHoursEnd, timeFormat);
  const placeholderAppointments = getPlaceholderAppointments(weekDays, todayKey, timeSlots.length);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Schedule</h2>
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            {weekDays[0].toLocaleDateString('en-US', { month: 'long' })} {weekDays[0].getFullYear()}
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
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Previous week"
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(getWeekStart(today))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50"
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
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
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
                <th className="w-14 p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-r border-gray-200 bg-gray-50" />
                {weekDays.map((d, colIndex) => {
                  const isToday = toDateKey(d) === todayKey;
                  return (
                    <th
                      key={toDateKey(d)}
                      className={`relative min-w-0 p-2 text-center border-b border-gray-200 bg-gray-50 ${
                        colIndex > 0 ? 'border-r' : ''
                      } ${isToday ? 'bg-primary-50/50' : ''}`}
                    >
                      <span className="block text-xs font-medium text-gray-500">
                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span
                        className={`inline-flex items-center justify-center mt-1 w-8 h-8 rounded-full text-sm font-semibold ${
                          isToday ? 'bg-primary-500 text-white ring-2 ring-primary-200' : 'text-gray-700'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                      {isToday && (
                        <div
                          className="absolute bottom-0 top-0 left-1/2 w-0.5 bg-primary-500 -translate-x-1/2 pointer-events-none"
                          aria-hidden
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, rowIndex) => (
                <tr key={slot}>
                  <td className="w-14 min-w-0 p-1.5 text-xs text-gray-500 border-r border-b border-gray-100 bg-gray-50/50 align-top overflow-hidden">
                    <Tooltip content={slot} placement="bottom">
                    <span className="truncate block">{slot}</span>
                  </Tooltip>
                  </td>
                  {weekDays.map((d, colIndex) => {
                    const isToday = toDateKey(d) === todayKey;
                    const appointment = placeholderAppointments.find(
                      (a) => a.dayIndex === colIndex && a.startSlot === rowIndex
                    );
                    const covered = placeholderAppointments.some(
                      (a) =>
                        a.dayIndex === colIndex && rowIndex > a.startSlot && rowIndex < a.endSlot
                    );
                    if (covered) return null;
                    if (appointment) {
                      return (
                        <td
                          key={toDateKey(d)}
                          rowSpan={appointment.endSlot - appointment.startSlot}
                          className={`relative border-b border-r border-gray-100 align-top p-1 min-w-0 overflow-hidden ${appointment.color} border rounded`}
                        >
                          <Tooltip content={appointment.label}>
                          <span className="text-xs font-medium truncate block">
                            {appointment.label}
                          </span>
                        </Tooltip>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={toDateKey(d)}
                        className={`border-b border-r border-gray-100 align-top min-w-0 ${
                          isToday ? 'bg-primary-50/30' : ''
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
