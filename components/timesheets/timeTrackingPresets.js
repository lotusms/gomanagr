/**
 * Industry → time-tracking UI emphasis (preview / mock layer).
 * Aligns with a flexible core: payroll, billing, and costing are separate concerns.
 */

/** @typedef {'professional' | 'shift' | 'field' | 'appointment' | 'compliance' | 'generic'} TimeTrackingGroup */

/** @type {Record<string, TimeTrackingGroup>} */
const INDUSTRY_TO_GROUP = {
  Technology: 'professional',
  Finance: 'professional',
  Legal: 'professional',
  Consulting: 'professional',
  Marketing: 'professional',
  Media: 'professional',
  Entertainment: 'professional',
  Telecommunications: 'field',
  Nonprofit: 'compliance',
  Government: 'compliance',
  Education: 'compliance',
  Healthcare: 'compliance',
  Retail: 'shift',
  Hospitality: 'shift',
  'Beauty & Spa': 'appointment',
  'Food & Drink': 'shift',
  'Health & Wellness': 'appointment',
  Automotive: 'field',
  Utilities: 'field',
  Manufacturing: 'shift',
  Construction: 'field',
  Agriculture: 'field',
  Energy: 'field',
  Transportation: 'field',
  'Home Services': 'field',
  'Real Estate': 'professional',
  'Travel & Tourism': 'field',
  Other: 'generic',
};

/**
 * @param {string | undefined} industry
 * @returns {TimeTrackingGroup}
 */
export function getTimeTrackingGroup(industry) {
  if (!industry || !INDUSTRY_TO_GROUP[industry]) return 'generic';
  return INDUSTRY_TO_GROUP[industry];
}

/**
 * Which optional columns / callouts to show in the mock UI.
 * @param {TimeTrackingGroup} group
 */
export function getFeatureFlagsForGroup(group) {
  return {
    showBillableAndRates: ['professional', 'field', 'appointment', 'generic', 'compliance'].includes(group),
    showShiftAttendance: ['shift', 'field', 'appointment'].includes(group),
    showWorkOrderJobSite: ['field'].includes(group),
    showAppointmentLink: ['appointment'].includes(group),
    showGrantProgram: group === 'compliance',
    showStrictApprovals: group === 'compliance',
    emphasizeTimer: group === 'professional' || group === 'generic',
    emphasizeClock: group === 'shift' || group === 'field',
  };
}
