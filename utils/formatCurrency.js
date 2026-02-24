/**
 * Formats a numeric value as currency based on the currency code.
 * 
 * @param {number|string} value - The numeric value to format
 * @param {string} currencyCode - ISO currency code (e.g., 'USD', 'EUR', 'GBP')
 * @param {Object} options - Formatting options
 * @param {boolean} options.showSymbol - Whether to show currency symbol (default: true)
 * @param {number} options.minimumFractionDigits - Minimum decimal places (default: 2)
 * @param {number} options.maximumFractionDigits - Maximum decimal places (default: 2)
 * @returns {string} - Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56, 'USD') // Returns '$1,234.56'
 * formatCurrency(1234.56, 'EUR') // Returns '€1,234.56'
 * formatCurrency(1234.56, 'GBP') // Returns '£1,234.56'
 */
export function formatCurrency(value, currencyCode = 'USD', options = {}) {
  const {
    showSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '';
  }

  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: showSymbol ? 'currency' : 'decimal',
      currency: currencyCode,
      minimumFractionDigits,
      maximumFractionDigits,
    });

    if (showSymbol) {
      return formatter.format(numValue);
    } else {
      return formatter.format(numValue).replace(/[^\d.,-]/g, '');
    }
  } catch (error) {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${numValue.toFixed(2)}`;
  }
}

/**
 * Parses a formatted currency string back to a numeric value.
 * 
 * @param {string} formattedValue - Formatted currency string
 * @returns {string} - Numeric string value (for input fields)
 * 
 * @example
 * unformatCurrency('$1,234.56') // Returns '1234.56'
 * unformatCurrency('€1,234.56') // Returns '1234.56'
 */
export function unformatCurrency(formattedValue) {
  if (!formattedValue) return '';
  
  const cleaned = formattedValue.replace(/[^\d.-]/g, '');
  
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  
  return cleaned;
}

/**
 * Gets the currency symbol for a given currency code.
 * 
 * @param {string} currencyCode - ISO currency code
 * @returns {string} - Currency symbol
 */
function getCurrencySymbol(currencyCode) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
    JPY: '¥',
  };
  
  return symbols[currencyCode] || currencyCode;
}

/**
 * Formats a currency value for display in an input field (as user types).
 * Handles partial input gracefully.
 * 
 * @param {string} value - Raw input value
 * @param {string} currencyCode - ISO currency code
 * @returns {string} - Formatted value for display
 */
export function formatCurrencyInput(value, currencyCode = 'USD') {
  if (!value) return '';
  
  const numericValue = unformatCurrency(value);
  
  if (!numericValue) return '';
  
  const num = parseFloat(numericValue);
  
  if (isNaN(num)) return '';
  
  const parts = numericValue.split('.');
  const hasDecimal = parts.length > 1;
  const decimalPart = hasDecimal ? parts[1] : '';
  
  const formattedInt = new Intl.NumberFormat('en-US').format(parts[0]);
  
  const formatted = hasDecimal ? `${formattedInt}.${decimalPart}` : formattedInt;
  
  return formatted;
}
