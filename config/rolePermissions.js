/**
 * Organization role permissions (org_members.role).
 *
 * - superadmin: Org creator (isOwner). Full access: all sidebar, Subscriptions, Developer, all Settings.
 * - admin / developer: Promoted admin (not creator). Same dashboard nav as admin (Projects, Proposals, Schedule, Clients, etc.).
 *   User menu: My Account, Settings (General, Theme), Logout.
 * - member: Team member. Access controlled by admin via Team Access (schedule, clients, projects, services).
 */

export const ORG_ROLE = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  MEMBER: 'member',
};

/** True if role is the org owner (only this role can promote others to admin, see all Settings, Subscriptions, Developer). */
export function isOwnerRole(role) {
  return role === ORG_ROLE.SUPERADMIN;
}

/** True if role is developer (same nav/powers as superadmin but trial is never applied). */
export function isDeveloperRole(role) {
  return role === ORG_ROLE.DEVELOPER;
}

/** True if role has owner-level menu access (Subscriptions, all Settings, Developer link, Backups). */
export function isOwnerOrDeveloperRole(role) {
  return role === ORG_ROLE.SUPERADMIN || role === ORG_ROLE.DEVELOPER;
}

/** True if role can perform admin-level actions (list members, invite, revoke, manage org schedule, etc.). */
export function isAdminRole(role) {
  return [ORG_ROLE.SUPERADMIN, ORG_ROLE.ADMIN, ORG_ROLE.DEVELOPER].includes(role);
}

/** True if role is a regular member (not superadmin/admin/developer). */
export function isMemberRole(role) {
  return role === ORG_ROLE.MEMBER;
}

/** True if role is admin or developer but not superadmin (promoted admin; uses org schedule from owner/superadmin profile). */
export function isAdminNonOwnerRole(role) {
  return (role === ORG_ROLE.ADMIN || role === ORG_ROLE.DEVELOPER);
}

/** True if role can export org backup (owner, developer, or admin). */
export function isOrgBackupAllowedRole(role) {
  return role === ORG_ROLE.SUPERADMIN || role === ORG_ROLE.ADMIN || role === ORG_ROLE.DEVELOPER;
}

/** Settings tab IDs that admin (non-owner) cannot see; only General and Theme are visible. */
export const ADMIN_NON_OWNER_HIDDEN_SETTINGS = [
  'organization',
  'team-access',
  'integrations',
  'billing',
  'security',
];

/** Settings tab IDs that members cannot see. */
export const MEMBER_HIDDEN_SETTINGS = [...ADMIN_NON_OWNER_HIDDEN_SETTINGS];
