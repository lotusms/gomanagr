/**
 * Example client-side utility
 * 
 * This file demonstrates client-side code that runs in the browser.
 * It can be imported in React components and pages.
 */

/**
 * Example client-side function
 * @param {string} input - Input string
 * @returns {string} Processed output
 */
export function processClientSide(input) {
  // This code runs in the browser
  // You can use browser APIs here
  if (typeof window !== 'undefined') {
    return `Client processed: ${input}`;
  }
  return input;
}

/**
 * Example: Browser-specific utility
 * @returns {boolean} Whether running in browser
 */
export function isBrowser() {
  return typeof window !== 'undefined';
}

/**
 * Example: Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
