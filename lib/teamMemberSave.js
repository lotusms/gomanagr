import { updateTeamMembers } from '@/services/userService';

/**
 * Clean a team member object: remove undefined values, clean nested objects.
 * Used before persisting to API or local state.
 */
export function cleanTeamMember(member) {
  const cleaned = {};
  Object.keys(member).forEach((key) => {
    if (member[key] !== undefined) {
      if (typeof member[key] === 'object' && member[key] !== null && !Array.isArray(member[key])) {
        const cleanedObj = {};
        Object.keys(member[key]).forEach((objKey) => {
          if (member[key][objKey] !== undefined) {
            cleanedObj[objKey] = member[key][objKey];
          }
        });
        if (Object.keys(cleanedObj).length > 0) {
          cleaned[key] = cleanedObj;
        }
      } else {
        cleaned[key] = member[key];
      }
    }
  });
  return cleaned;
}

export function generateId() {
  return `tm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Persist team list to backend and optionally update local state.
 * @param {Array} cleanedTeam - Array of team member objects (will be cleaned again)
 * @param {Object} options
 * @param {string} options.currentUserId - currentUser.uid
 * @param {Object} [options.organization] - org for update-org-team path
 * @param {string|null} [options.ownerUserId] - when set with organization, use org-team API
 * @param {boolean} [options.showInactive] - filter for local list
 * @param {Function} [options.setUserAccount] - (updater) => void - update UserAccount context
 * @param {Function} [options.setOwnerTeamMembers] - (list) => void - for org path on team index
 * @param {Function} [options.setTeam] - (filteredList) => void - for team index
 * @param {Function} [options.broadcastTeamUpdated] - () => void - for realtime
 */
export async function persistTeam(cleanedTeam, options) {
  const {
    currentUserId,
    organization,
    ownerUserId,
    showInactive = false,
    setUserAccount,
    setOwnerTeamMembers,
    setTeam,
    broadcastTeamUpdated,
  } = options;

  const list = Array.isArray(cleanedTeam) ? cleanedTeam.map(cleanTeamMember) : [];

  if (ownerUserId && organization?.id) {
    const res = await fetch('/api/update-org-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: organization.id,
        callerUserId: currentUserId,
        teamMembers: list,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || 'Failed to update team');
    }
    if (setOwnerTeamMembers) setOwnerTeamMembers(list);
    const filteredList = showInactive ? list : list.filter((m) => (m.status || 'active') !== 'inactive');
    if (setTeam) setTeam(filteredList);
    if (typeof broadcastTeamUpdated === 'function') broadcastTeamUpdated();
  } else {
    await updateTeamMembers(currentUserId, list);
    if (setUserAccount) setUserAccount((prev) => (prev ? { ...prev, teamMembers: list } : null));
    const filteredList = showInactive ? list : list.filter((m) => (m.status || 'active') !== 'inactive');
    if (setTeam) setTeam(filteredList);
    if (typeof broadcastTeamUpdated === 'function') broadcastTeamUpdated();
  }
}
