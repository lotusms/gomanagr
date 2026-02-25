/**
 * Sort team members for display: super admin first, then admins, then the rest; within each group by name.
 * @param {Array<{ isOwner?: boolean, isAdmin?: boolean, name?: string }>} members
 * @returns {Array} New sorted array (does not mutate input).
 */
export function sortTeamMembersPinned(members) {
  return [...members].sort((a, b) => {
    const aSuper = a.isOwner === true;
    const bSuper = b.isOwner === true;
    if (aSuper && !bSuper) return -1;
    if (!aSuper && bSuper) return 1;
    const aAdmin = a.isAdmin === true;
    const bAdmin = b.isAdmin === true;
    if (aAdmin && !bAdmin) return -1;
    if (!aAdmin && bAdmin) return 1;
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
}
