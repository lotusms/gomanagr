/**
 * Utility functions for checking trial status
 */

const TRIAL_DAYS = 14;

/**
 * Check if a user's trial has expired
 * @param {Object} userAccount - User account object
 * @returns {Object} { expired: boolean, daysRemaining: number, trialEndsAt: Date | null }
 */
export function getTrialStatus(userAccount) {
  if (!userAccount) {
    return { expired: false, daysRemaining: 0, trialEndsAt: null };
  }

  // If not on trial, return not expired
  if (userAccount.trial !== true) {
    return { expired: false, daysRemaining: 0, trialEndsAt: null };
  }

  // Check trialEndsAt if available
  if (userAccount.trialEndsAt) {
    const trialEnd = new Date(userAccount.trialEndsAt);
    const now = new Date();
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      expired: diffDays <= 0,
      daysRemaining: diffDays > 0 ? diffDays : 0,
      trialEndsAt: trialEnd,
    };
  }

  // Legacy account: check createdAt
  if (userAccount.createdAt) {
    const createdAt = new Date(userAccount.createdAt);
    const now = new Date();
    const diffTime = now - createdAt;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const trialEnd = new Date(createdAt);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    
    return {
      expired: diffDays > TRIAL_DAYS,
      daysRemaining: diffDays > TRIAL_DAYS ? 0 : Math.ceil(TRIAL_DAYS - diffDays),
      trialEndsAt: trialEnd,
    };
  }

  // No trial info - assume expired for safety
  return { expired: true, daysRemaining: 0, trialEndsAt: null };
}

/**
 * Calculate trial end date from creation date
 * @param {string|Date} createdAt - Account creation date
 * @returns {Date} Trial end date
 */
export function calculateTrialEndDate(createdAt) {
  const created = new Date(createdAt);
  const trialEnd = new Date(created);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  return trialEnd;
}
