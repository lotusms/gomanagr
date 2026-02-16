/**
 * Formats a phone number string to (xxx) xxx-xxxx format as the user types.
 * Strips all non-digit characters and formats progressively.
 * 
 * @param {string} value - Raw phone number input (may contain non-digits)
 * @returns {string} - Formatted phone number in (xxx) xxx-xxxx format
 * 
 * @example
 * formatPhone('7171234567') // Returns '(717) 123-4567'
 * formatPhone('717123456') // Returns '(717) 123-456'
 * formatPhone('71712345') // Returns '(717) 123-45'
 * formatPhone('717') // Returns '(717'
 * formatPhone('7171234567890') // Returns '(717) 123-4567' (truncates to 10 digits)
 */
export function formatPhone(value) {
  if (!value) return '';

  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Limit to 10 digits (US phone number format)
  const limitedDigits = digits.slice(0, 10);

  // Format based on length
  if (limitedDigits.length === 0) {
    return '';
  } else if (limitedDigits.length <= 3) {
    return `(${limitedDigits}`;
  } else if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  } else {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  }
}

/**
 * Removes formatting from a phone number string, returning only digits.
 * 
 * @param {string} formattedPhone - Formatted phone number string
 * @returns {string} - Digits only
 * 
 * @example
 * unformatPhone('(717) 123-4567') // Returns '7171234567'
 * unformatPhone('717-123-4567') // Returns '7171234567'
 */
export function unformatPhone(formattedPhone) {
  if (!formattedPhone) return '';
  return formattedPhone.replace(/\D/g, '');
}
