/**
 * Unit tests for rolePermissions:
 * - isOwnerRole, isDeveloperRole, isOwnerOrDeveloperRole
 * - isAdminRole, isMemberRole, isAdminNonOwnerRole, isOrgBackupAllowedRole
 */

import {
  ORG_ROLE,
  isOwnerRole,
  isDeveloperRole,
  isOwnerOrDeveloperRole,
  isAdminRole,
  isMemberRole,
  isAdminNonOwnerRole,
  isOrgBackupAllowedRole,
} from '@/config/rolePermissions';

describe('rolePermissions', () => {
  describe('isOwnerRole', () => {
    it('returns true only for superadmin', () => {
      expect(isOwnerRole(ORG_ROLE.SUPERADMIN)).toBe(true);
      expect(isOwnerRole('superadmin')).toBe(true);
      expect(isOwnerRole(ORG_ROLE.DEVELOPER)).toBe(false);
      expect(isOwnerRole(ORG_ROLE.ADMIN)).toBe(false);
      expect(isOwnerRole(ORG_ROLE.MEMBER)).toBe(false);
      expect(isOwnerRole(null)).toBe(false);
    });
  });

  describe('isDeveloperRole', () => {
    it('returns true only for developer', () => {
      expect(isDeveloperRole(ORG_ROLE.DEVELOPER)).toBe(true);
      expect(isDeveloperRole('developer')).toBe(true);
      expect(isDeveloperRole(ORG_ROLE.SUPERADMIN)).toBe(false);
      expect(isDeveloperRole(ORG_ROLE.ADMIN)).toBe(false);
      expect(isDeveloperRole(ORG_ROLE.MEMBER)).toBe(false);
    });
  });

  describe('isOwnerOrDeveloperRole', () => {
    it('returns true for superadmin and developer only', () => {
      expect(isOwnerOrDeveloperRole(ORG_ROLE.SUPERADMIN)).toBe(true);
      expect(isOwnerOrDeveloperRole(ORG_ROLE.DEVELOPER)).toBe(true);
      expect(isOwnerOrDeveloperRole(ORG_ROLE.ADMIN)).toBe(false);
      expect(isOwnerOrDeveloperRole(ORG_ROLE.MEMBER)).toBe(false);
    });
  });

  describe('isAdminRole', () => {
    it('returns true for superadmin, admin, and developer', () => {
      expect(isAdminRole(ORG_ROLE.SUPERADMIN)).toBe(true);
      expect(isAdminRole(ORG_ROLE.ADMIN)).toBe(true);
      expect(isAdminRole(ORG_ROLE.DEVELOPER)).toBe(true);
      expect(isAdminRole(ORG_ROLE.MEMBER)).toBe(false);
    });
  });

  describe('isMemberRole', () => {
    it('returns true only for member', () => {
      expect(isMemberRole(ORG_ROLE.MEMBER)).toBe(true);
      expect(isMemberRole(ORG_ROLE.SUPERADMIN)).toBe(false);
      expect(isMemberRole(ORG_ROLE.DEVELOPER)).toBe(false);
    });
  });

  describe('isAdminNonOwnerRole', () => {
    it('returns true for admin and developer, false for superadmin and member', () => {
      expect(isAdminNonOwnerRole(ORG_ROLE.ADMIN)).toBe(true);
      expect(isAdminNonOwnerRole(ORG_ROLE.DEVELOPER)).toBe(true);
      expect(isAdminNonOwnerRole(ORG_ROLE.SUPERADMIN)).toBe(false);
      expect(isAdminNonOwnerRole(ORG_ROLE.MEMBER)).toBe(false);
    });
  });

  describe('isOrgBackupAllowedRole', () => {
    it('returns true for superadmin, admin, and developer', () => {
      expect(isOrgBackupAllowedRole(ORG_ROLE.SUPERADMIN)).toBe(true);
      expect(isOrgBackupAllowedRole(ORG_ROLE.ADMIN)).toBe(true);
      expect(isOrgBackupAllowedRole(ORG_ROLE.DEVELOPER)).toBe(true);
      expect(isOrgBackupAllowedRole(ORG_ROLE.MEMBER)).toBe(false);
    });
  });
});
