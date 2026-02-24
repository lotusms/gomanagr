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

export function parseTimeToSlotIndex(timeStr, startHour) {
  const h = parseHour(timeStr);
  const m = parseMinute(timeStr);
  return (h - startHour) * 2 + m / 30;
}

export function buildTimeSlots(startStr, endStr, timeFormat) {
  const startHour = parseHour(startStr);
  const endHour = parseHour(endStr);
  const slots = [];
  for (let h = startHour; h <= endHour; h++) {
    slots.push({ hour: h, minute: 0 });
    if (h < endHour) slots.push({ hour: h, minute: 30 });
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
