export function parseHour(str) {
  const match = String(str || '').match(/^(\d{1,2})/);
  return match ? Math.min(23, Math.max(0, parseInt(match[1], 10))) : 8;
}

export function parseMinute(str) {
  const match = String(str || '').match(/:(\d{2})/);
  if (!match) return 0;
  const m = parseInt(match[1], 10);
  return m >= 30 ? 30 : 0;
}

/** Minutes since midnight from HH:MM (24h). */
export function parseTimeToMinutesOfDay(timeStr) {
  const h = parseHour(timeStr);
  const match = String(timeStr || '').match(/:(\d{2})/);
  const m = match ? parseInt(match[1], 10) : 0;
  return h * 60 + Math.min(59, Math.max(0, m));
}

/**
 * Slot index along the business-day axis. Integer or fractional (e.g. hourly grid + half-past start).
 * @param {string} timeStr
 * @param {number} startHour - business start hour (0–23)
 * @param {number} incrementMinutes - minutes per column (30 = half-hour, 60 = one hour)
 */
export function parseTimeToSlotIndex(timeStr, startHour, incrementMinutes = 30) {
  const startM = startHour * 60;
  const t = parseTimeToMinutesOfDay(timeStr);
  return (t - startM) / incrementMinutes;
}

/**
 * @param {string} startStr
 * @param {string} endStr
 * @param {'12h'|'24h'} timeFormat
 * @param {number} incrementMinutes - minutes per column (30 = half-hour slots, 60 = hourly only)
 */
export function buildTimeSlots(startStr, endStr, timeFormat, incrementMinutes = 30) {
  const startHour = parseHour(startStr);
  const endHour = parseHour(endStr);
  const slots = [];
  if (incrementMinutes === 60) {
    for (let h = startHour; h <= endHour; h++) {
      slots.push({ hour: h, minute: 0 });
    }
  } else {
    for (let h = startHour; h <= endHour; h++) {
      slots.push({ hour: h, minute: 0 });
      if (h < endHour) slots.push({ hour: h, minute: 30 });
    }
  }
  if (timeFormat === '12h') {
    return slots.map(({ hour, minute }) => {
      const d = new Date(2000, 0, 1, hour, minute, 0);
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    });
  }
  return slots.map(
    ({ hour, minute }) =>
      `${String(hour).padStart(2, '0')}:${minute === 30 ? '30' : '00'}`
  );
}
