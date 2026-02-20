/**
 * Utility functions for checking user permissions
 */

/**
 * Check if the current user is an admin or developer
 * @param {Object} userAccount - User account object
 * @param {string} currentUserId - Current user's Firebase Auth UID
 * @returns {boolean} True if user is admin or developer
 */
export function isAdminOrDeveloper(userAccount, currentUserId) {
  if (!userAccount || !currentUserId) return false;

  // Account owner is always an admin
  const isAccountOwner = userAccount.userId === currentUserId;
  
  // Check if user has developer mode enabled
  const isDeveloper = userAccount.developerMode === true;

  // User is admin (account owner) or developer
  return isAccountOwner || isDeveloper;
}

/**
 * Check if the current user is a developer
 * @param {Object} userAccount - User account object
 * @returns {boolean} True if user has developer mode enabled
 */
export function isDeveloper(userAccount) {
  return userAccount?.developerMode === true;
}
