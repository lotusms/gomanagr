/**
 * Timezone dropdown options: IANA Time Zone Database identifiers (same names `Intl` uses).
 * Curated list of commonly used zones — not the full ~600 IANA zones (see tzdb zone1970.tab).
 * @see https://www.iana.org/time-zones
 */

/** @type {readonly string[]} */
const COMMON_IANA_TIME_ZONES = [
  'UTC',

  // United States
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Adak',
  'Pacific/Honolulu',

  // Canada & Mexico
  'America/Toronto',
  'America/Vancouver',
  'America/Edmonton',
  'America/Winnipeg',
  'America/Regina',
  'America/Halifax',
  'America/St_Johns',
  'America/Mexico_City',
  'America/Cancun',
  'America/Tijuana',
  'America/Chihuahua',
  'America/Mazatlan',
  'America/Merida',
  'America/Monterrey',

  // Central & South America & Caribbean
  'America/Guatemala',
  'America/Bogota',
  'America/Lima',
  'America/La_Paz',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'America/Caracas',
  'America/Havana',
  'America/Jamaica',
  'America/Panama',
  'America/Puerto_Rico',
  'America/Santo_Domingo',

  // Atlantic
  'Atlantic/Azores',
  'Atlantic/Bermuda',
  'Atlantic/Cape_Verde',
  'Atlantic/South_Georgia',
  'America/Godthab',

  // Europe
  'Europe/London',
  'Europe/Dublin',
  'Europe/Lisbon',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Zurich',
  'Europe/Vienna',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Copenhagen',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Budapest',
  'Europe/Athens',
  'Europe/Bucharest',
  'Europe/Helsinki',
  'Europe/Kiev',
  'Europe/Istanbul',
  'Europe/Moscow',

  // Africa
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Casablanca',

  // Middle East
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Baghdad',
  'Asia/Tehran',
  'Asia/Jerusalem',

  // South & Central Asia
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Katmandu',

  // Southeast Asia
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Manila',
  'Asia/Kuala_Lumpur',
  'Asia/Ho_Chi_Minh',

  // East Asia
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',

  // Australia & Oceania
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Darwin',
  'Australia/Brisbane',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Port_Moresby',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Pacific/Chatham',
  'Pacific/Tongatapu',
  'Pacific/Apia',
  'Pacific/Guam',
  'Pacific/Pago_Pago',
];

function isValidIanaTimeZone(id) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: id }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} timeZone IANA id
 * @param {Date} [at]
 * @returns {string} e.g. UTC+05:30, UTC-04:00
 */
export function utcOffsetLabelForZone(timeZone, at = new Date()) {
  const tz = timeZone || 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
    }).formatToParts(at);
    let raw = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (raw) {
      raw = raw.replace(/\u2212/g, '-');
      if (/^GMT$/i.test(raw)) {
        return 'UTC+00:00';
      }
      if (/^GMT/i.test(raw)) {
        return raw.replace(/^GMT/i, 'UTC');
      }
    }
  } catch (_) {
    /* fall through */
  }
  return 'UTC+00:00';
}

function parseUtcOffsetToSortMinutes(label) {
  const m = label.match(/UTC([+-])(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const sign = m[1] === '+' ? 1 : -1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

/**
 * Human-readable zone name for search (e.g. "Eastern Time", "Central Time") via Intl.
 * @param {string} ianaId
 * @param {Date} [at]
 * @returns {string|null} null when generic name should be omitted
 */
export function timeZoneLongGenericName(ianaId, at = new Date()) {
  if (!ianaId || ianaId === 'UTC') return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaId,
      timeZoneName: 'longGeneric',
    }).formatToParts(at);
    let name = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (!name) return null;
    if (name === 'GMT' || name === 'UTC') return null;
    return name;
  } catch (_) {
    return null;
  }
}

function buildTimeZoneLabel(ianaId, off) {
  if (ianaId === 'UTC') {
    return `UTC (${off})`;
  }
  const generic = timeZoneLongGenericName(ianaId);
  if (generic) {
    return `${generic} — ${ianaId} (${off})`;
  }
  return `${ianaId} (${off})`;
}

/**
 * Curated IANA zone ids (COMMON_IANA_TIME_ZONES), omitting any id the runtime rejects.
 */
export function listIanaTimeZoneIds() {
  const seen = new Set();
  const out = [];
  for (const id of COMMON_IANA_TIME_ZONES) {
    if (seen.has(id)) continue;
    if (!isValidIanaTimeZone(id)) continue;
    seen.add(id);
    out.push(id);
  }
  if (out.length === 0) {
    return ['UTC'];
  }
  if (!out.includes('UTC') && isValidIanaTimeZone('UTC')) {
    out.unshift('UTC');
  }
  return out;
}

/**
 * @param {Date} [at] Reference instant for DST-aware offsets
 * @returns {{ value: string, label: string }[]}
 */
export function buildTimeZoneSelectOptions(at = new Date()) {
  const ids = listIanaTimeZoneIds();
  const rows = ids.map((id) => {
    const off = utcOffsetLabelForZone(id, at);
    return {
      value: id,
      label: buildTimeZoneLabel(id, off),
      _m: parseUtcOffsetToSortMinutes(off),
    };
  });
  rows.sort((a, b) => {
    const da = a._m;
    const db = b._m;
    if (da != null && db != null && da !== db) return da - db;
    if (da != null && db == null) return -1;
    if (da == null && db != null) return 1;
    return a.value.localeCompare(b.value);
  });
  return rows.map(({ value, label }) => ({ value, label }));
}

let optionsCache = null;

export function getTimeZoneSelectOptions() {
  if (!optionsCache) {
    optionsCache = buildTimeZoneSelectOptions();
  }
  return optionsCache;
}

/**
 * Ensures the current value appears in the list (e.g. legacy or renamed zone).
 */
export function ensureTimeZoneOption(options, value) {
  if (!value || options.some((o) => o.value === value)) return options;
  const off = utcOffsetLabelForZone(value);
  return [{ value, label: buildTimeZoneLabel(value, off) }, ...options];
}
