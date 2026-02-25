/**
 * Team invite visibility: when to show "Invite to join" vs "Revoke access" on a member card.
 * - Invite is hidden for super admin (owner) and org admins.
 * - If the person is already invited (pending invite) or has access, show "Revoke access" instead of "Invite to join".
 *
 * @param {Object} member - Team member { email, invitedAt, isAdmin, isOwner }
 * @param {Object} context - { hasAccess, hasPendingInvite, isCurrentUser, currentUserIsOrgAdmin }
 * @returns {{ showInvite: boolean, showRevoke: boolean }}
 */
export function getInviteAvailability(member, context) {
  const { hasAccess, hasPendingInvite, isCurrentUser, currentUserIsOrgAdmin } = context;
  if (!currentUserIsOrgAdmin) {
    return { showInvite: false, showRevoke: false };
  }
  if (member.isAdmin === true || member.isOwner === true) {
    return { showInvite: false, showRevoke: false };
  }
  const showRevokeOnly = (hasAccess || hasPendingInvite) && !isCurrentUser;
  const showInvite = !showRevokeOnly && !isCurrentUser;
  const showRevoke = showRevokeOnly;
  return { showInvite, showRevoke };
}
