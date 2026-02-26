/**
 * Capitalizes the first letter of each word (title case) for use in First name / Last name fields.
 * Multiple spaces are collapsed; leading/trailing space is trimmed.
 * @param {string} value - Raw input (e.g. "john  doe")
 * @returns {string} Title-cased string (e.g. "John Doe")
 */
export function capitalizeName(value) {
  if (value == null || typeof value !== 'string') return '';
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
