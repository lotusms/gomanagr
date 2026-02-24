/**
 * Example server-side utility
 * 
 * This file demonstrates server-side code that runs only on Node.js.
 * It cannot be imported in client-side components.
 */

/**
 * Example server-side function
 * @param {string} input - Input string
 * @returns {string} Processed output
 */
export function processServerSide(input) {
  return `Server processed: ${input}`;
}

/**
 * Example: Access server-only environment variables
 * @returns {object} Server config
 */
export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    serverSecret: process.env.SERVER_SECRET || 'not-set',
  };
}
