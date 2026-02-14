import { buildTimeSlots, parseHour, parseTimeToSlotIndex } from './scheduleTimeUtils';
import Tooltip from '@/components/ui/Tooltip';

// Placeholder staff (10 total) and appointments for today (replace with real data later)
// Appointments use "HH:00" or "HH:30" for half-hour slot math
const PLACEHOLDER_STAFF = [
  { id: '1', name: 'Alina Perez' },
  { id: '2', name: 'Mark Peck' },
  { id: '3', name: 'Jordan Lee' },
  { id: '4', name: 'Sam Rivera' },
  { id: '5', name: 'Casey Morgan' },
  { id: '6', name: 'Riley Chen' },
  { id: '7', name: 'Alex Kim' },
  { id: '8', name: 'Taylor Wright' },
  { id: '9', name: 'Jamie Foster' },
  { id: '10', name: 'Quinn Hayes' },
];

// Appointments evenly spread across the day (half-hour slots from 8:00–18:00 = 20 slots)
function getPlaceholderAppointmentsForToday(startHour) {
  const raw = [
    { staffId: '1', start: '09:00', end: '12:00', label: 'Mary Smith Blowdry' },
    { staffId: '2', start: '14:00', end: '15:00', label: 'Karl Halloway Haircut' },
    { staffId: '3', start: '09:00', end: '09:30', label: 'Sandra Dickinson Haircut' },
    { staffId: '4', start: '10:30', end: '12:00', label: 'Jane Doe Haircut' },
    { staffId: '5', start: '13:00', end: '14:30', label: 'Lisa Smith Full Body Massage' },
    { staffId: '6', start: '15:00', end: '16:30', label: 'John Doe Haircut' },
    { staffId: '7', start: '11:00', end: '12:30', label: 'Peter Parker Haircut' },
    { staffId: '8', start: '16:00', end: '17:00', label: 'Clark Kent Deep Conditioning' },
    { staffId: '9', start: '09:30', end: '11:00', label: 'Tony Stark Haircut' },
    { staffId: '10', start: '14:30', end: '16:00', label: 'Bruce Wayne Facial' },
  ];
  return raw.map((a) => ({
    ...a,
    startSlot: parseTimeToSlotIndex(a.start, startHour),
    endSlot: parseTimeToSlotIndex(a.end, startHour),
  }));
}

export default function TodaysAppointments({
  businessHoursStart = '08:00',
  businessHoursEnd = '18:00',
  timeFormat = '24h',
}) {
  const timeSlots = buildTimeSlots(businessHoursStart, businessHoursEnd, timeFormat);
  const startHour = parseHour(businessHoursStart);
  const appointments = getPlaceholderAppointmentsForToday(startHour);
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Today&apos;s appointments</h2>
      <p className="text-sm text-gray-500 mb-2">{todayLabel}</p>
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse min-w-[500px] text-xs">
            <thead>
              <tr>
                <th className="w-36 py-1.5 px-2 text-left font-medium uppercase tracking-wide border-b border-r border-gray-200 text-white bg-secondary-500">
                  Staff
                </th>
                {timeSlots.map((slot) => (
                  <th
                    key={slot}
                    className="min-w-0 py-1.5 px-1 text-center font-medium text-white uppercase tracking-wide border-b border-gray-200 bg-secondary-500 overflow-hidden"
                  >
                    <Tooltip content={slot} placement="bottom">
                      <span className="truncate block">{slot}</span>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER_STAFF.map((staff) => {
                const staffAppointments = appointments.filter((a) => a.staffId === staff.id);
                return (
                  <tr key={staff.id}>
                    <td className="w-36 py-1 px-2 border-r border-b border-gray-100 bg-gray-50/50 font-medium text-gray-900 leading-tight">
                      {staff.name}
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
                        const tooltipContent = `${appointment.label}\n${timeRangeText}`;
                        return (
                          <td
                            key={colIndex}
                            colSpan={span}
                            className="min-w-0 py-1 px-0.5 align-top border-b border-r border-gray-100 overflow-hidden"
                          >
                            <Tooltip content={tooltipContent}>
                              <div className="bg-primary-100 border border-primary-200 text-primary-800 rounded px-1.5 py-1 font-medium min-w-0 overflow-hidden leading-tight">
                                <span className="truncate block">
                                  {appointment.label}
                                </span>
                                <span className="truncate block text-primary-600 mt-px">
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
                          className="min-w-0 py-1 border-b border-r border-gray-100 align-top"
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
    </div>
  );
}
