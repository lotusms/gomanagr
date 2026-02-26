/**
 * Expand appointment recurrence into an array of appointment dates (YYYY-MM-DD).
 * Caps occurrences when no end date to avoid running endlessly (default: 2 years or 500 occurrences).
 */

const MAX_OCCURRENCES = 500;
const MAX_DAYS_NO_END = 365 * 2; // 2 years when no end date

function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Generate occurrence dates for a recurrence rule.
 * @param {Object} recurrence - { isRecurring, frequency, specificDays?, monthlyDay?, recurrenceStart, recurrenceEnd?, noEndDate }
 * @returns {string[]} Array of YYYY-MM-DD dates
 */
export function expandRecurrence(recurrence) {
  if (!recurrence?.isRecurring || !recurrence.recurrenceStart) return [];

  const start = parseDate(recurrence.recurrenceStart);
  if (!start || isNaN(start.getTime())) return [];

  let endDate = null;
  if (recurrence.noEndDate || recurrence.recurrenceEnd == null || recurrence.recurrenceEnd === '') {
    const cap = new Date(start);
    cap.setDate(cap.getDate() + MAX_DAYS_NO_END);
    endDate = cap;
  } else {
    endDate = parseDate(recurrence.recurrenceEnd);
    if (!endDate || isNaN(endDate.getTime())) return [toDateKey(start)];
  }

  const dates = [];
  const frequency = recurrence.frequency || 'weekly';
  const specificDays = Array.isArray(recurrence.specificDays) ? recurrence.specificDays : [];
  const monthlyDay = Math.min(31, Math.max(1, parseInt(recurrence.monthlyDay, 10) || 1));
  const startDayOfWeek = start.getDay();

  let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (current <= end && dates.length < MAX_OCCURRENCES) {
    let include = false;

    switch (frequency) {
      case 'daily':
        include = true;
        break;
      case 'weekly':
        include = current.getDay() === startDayOfWeek;
        break;
      case 'specific_days':
        include = specificDays.length > 0 && specificDays.includes(current.getDay());
        break;
      case 'monthly':
        include = current.getDate() === monthlyDay;
        break;
      case 'yearly':
        include = current.getMonth() === start.getMonth() && current.getDate() === start.getDate();
        break;
      default:
        include = true;
    }

    if (include) dates.push(toDateKey(current));

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Expand a base appointment (with recurrence) into an array of appointment objects, one per occurrence date.
 * @param {Object} baseAppointment - { id, staffId, start, end, services, label, clientId, ... }
 * @param {Object} recurrence - recurrence config
 * @returns {Object[]} Array of appointment objects with unique ids and dates
 */
export function expandAppointmentWithRecurrence(baseAppointment, recurrence) {
  const dates = expandRecurrence(recurrence);
  if (dates.length === 0) return [baseAppointment];

  const baseId = baseAppointment.id || `apt-${Date.now()}`;
  return dates.map((date, i) => ({
    ...baseAppointment,
    id: dates.length === 1 ? baseId : `${baseId}-${i}-${date}`,
    date,
    start: baseAppointment.start,
    end: baseAppointment.end,
    staffId: baseAppointment.staffId,
    services: baseAppointment.services,
    label: baseAppointment.label,
    clientId: baseAppointment.clientId,
    createdAt: baseAppointment.createdAt,
    updatedAt: new Date().toISOString(),
  }));
}
