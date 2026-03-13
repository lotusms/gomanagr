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

  if (userAccount.trial !== true) {
    return { expired: false, daysRemaining: 0, trialEndsAt: null };
  }

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

/**
 * Check if the organization's trial has expired (for paywall / superadmin flow).
 * Team members are not subject to trial; only org superadmin/owner is.
 * @param {Object} organization - Organization object with trial, trial_ends_at
 * @returns {Object} { expired: boolean, daysRemaining: number, trialEndsAt: Date | null }
 */
export function getOrgTrialStatus(organization) {
  if (!organization) {
    return { expired: false, daysRemaining: 0, trialEndsAt: null };
  }

  if (organization.trial !== true) {
    return { expired: false, daysRemaining: 0, trialEndsAt: null };
  }

  const trialEndsAtRaw = organization.trial_ends_at ?? organization.trialEndsAt;
  if (trialEndsAtRaw) {
    const trialEnd = new Date(trialEndsAtRaw);
    const now = new Date();
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      expired: diffDays <= 0,
      daysRemaining: diffDays > 0 ? diffDays : 0,
      trialEndsAt: trialEnd,
    };
  }

  const createdAt = organization.created_at ?? organization.createdAt;
  if (createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const trialEnd = new Date(created);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      expired: diffDays <= 0,
      daysRemaining: diffDays > 0 ? diffDays : 0,
      trialEndsAt: trialEnd,
    };
  }

  return { expired: true, daysRemaining: 0, trialEndsAt: null };
}
