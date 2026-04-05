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

/** Recurrence id suffix: -index-YYYY-MM-DD (e.g. -0-2026-05-12) */
const RECURRENCE_ID_SUFFIX = /-\d+-\d{4}-\d{2}-\d{2}$/;

/**
 * Get the base id for a recurring series, or null if this id is not a recurrence occurrence id.
 * @param {string} appointmentId - e.g. "apt-123-0-2026-05-12"
 * @returns {string|null} Base id (e.g. "apt-123") or null
 */
export function getRecurrenceBaseId(appointmentId) {
  if (!appointmentId || typeof appointmentId !== 'string') return null;
  const base = appointmentId.replace(RECURRENCE_ID_SUFFIX, '');
  return base !== appointmentId ? base : null;
}

/**
 * Whether this appointment id belongs to a recurring series (expanded occurrence).
 * @param {string} appointmentId
 * @returns {boolean}
 */
export function isRecurrenceOccurrenceId(appointmentId) {
  return getRecurrenceBaseId(appointmentId) !== null;
}

/**
 * Get all appointments in the same recurring series with date on or after fromDate (never past).
 * @param {Object[]} appointments - Full list of appointments
 * @param {string} baseId - From getRecurrenceBaseId(clicked.id)
 * @param {string} fromDate - YYYY-MM-DD (inclusive)
 * @returns {Object[]} Appointments to delete (same series, date >= fromDate)
 */
export function getRecurrenceSeriesFromDate(appointments, baseId, fromDate) {
  if (!baseId || !fromDate || !Array.isArray(appointments)) return [];
  return appointments.filter((apt) => {
    const aptBase = getRecurrenceBaseId(apt.id);
    const sameSeries = aptBase === baseId || apt.id === baseId;
    const aptDate = typeof apt.date === 'string' ? apt.date : (apt.date && apt.date.split?.('T')[0]);
    return sameSeries && aptDate && aptDate >= fromDate;
  });
}

/**
 * Check if this appointment is part of a recurring series (has same-base siblings in the list).
 * @param {Object} appointment - The clicked appointment
 * @param {Object[]} allAppointments - Full list
 * @returns {boolean}
 */
export function isPartOfRecurringSeries(appointment, allAppointments) {
  const baseId = getRecurrenceBaseId(appointment?.id);
  if (!baseId) return false;
  const inSeries = allAppointments.filter(
    (a) => getRecurrenceBaseId(a.id) === baseId || a.id === baseId
  );
  return inSeries.length > 1;
}

function dayDiffYmd(a, b) {
  const ms = new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime();
  return Math.round(ms / 86400000);
}

/**
 * Normalize stored recurrence for the edit form.
 */
function normalizeRecurrence(r) {
  return {
    isRecurring: true,
    frequency: r.frequency || 'weekly',
    specificDays: Array.isArray(r.specificDays) ? r.specificDays : [],
    monthlyDay: Math.min(31, Math.max(1, parseInt(r.monthlyDay, 10) || 1)),
    recurrenceStart: r.recurrenceStart || '',
    recurrenceEnd: r.recurrenceEnd ?? null,
    noEndDate: !!r.noEndDate,
  };
}

/**
 * Rebuild recurrence state when editing: use stored `appointment.recurrence` when present,
 * or infer from series id / sibling occurrences (legacy rows had recurrence stripped on save).
 * @returns {Object|null} Recurrence state for AppointmentRecurrence, or null if not recurring.
 */
export function getRecurrenceStateForEdit(appointment, allAppointments) {
  if (!appointment?.id) return null;

  const r = appointment.recurrence;
  if (r && typeof r === 'object' && r.isRecurring) {
    return normalizeRecurrence(r);
  }

  const baseId = getRecurrenceBaseId(appointment.id);
  const seriesBase = baseId || appointment.id;

  const series = (allAppointments || []).filter((a) => {
    const aptBase = getRecurrenceBaseId(a.id);
    return aptBase === seriesBase || a.id === seriesBase;
  });

  const isOccurrenceRow = baseId != null;
  const multiRowSeries = series.length > 1;
  if (!isOccurrenceRow && !multiRowSeries) return null;

  const dates = series
    .map((a) => (typeof a.date === 'string' ? a.date : ''))
    .filter(Boolean)
    .sort();

  const recurrenceStart = dates[0] || (typeof appointment.date === 'string' ? appointment.date : '');
  const recurrenceEnd = dates.length > 1 ? dates[dates.length - 1] : recurrenceStart;

  let frequency = 'daily';
  let specificDays = [];

  if (dates.length >= 2) {
    const steps = [];
    for (let i = 1; i < dates.length; i++) {
      steps.push(dayDiffYmd(dates[i - 1], dates[i]));
    }
    const allDailySteps = steps.every((s) => s === 1);
    const allWeeklySteps = steps.every((s) => s === 7);

    if (allDailySteps) {
      frequency = 'daily';
    } else if (allWeeklySteps) {
      frequency = 'weekly';
    } else {
      const weekdays = [...new Set(dates.map((d) => new Date(`${d}T12:00:00`).getDay()))].sort((x, y) => x - y);
      if (weekdays.length > 0 && weekdays.length < 7) {
        frequency = 'specific_days';
        specificDays = weekdays;
      } else {
        frequency = 'weekly';
      }
    }
  }

  return {
    isRecurring: true,
    frequency,
    specificDays,
    monthlyDay: 1,
    recurrenceStart,
    recurrenceEnd,
    noEndDate: false,
  };
}
