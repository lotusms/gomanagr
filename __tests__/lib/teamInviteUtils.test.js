import { getInviteAvailability } from '@/lib/teamInviteUtils';

/**
 * getInviteAvailability() drives both:
 * - Team member card: "Invite to join" / "Revoke access" actions on each card
 * - Edit drawer (AddTeamMemberForm): same actions when editing a member
 * So these tests define the single source of truth for when each action is shown.
 */
describe('getInviteAvailability', () => {
  const baseContext = {
    hasAccess: false,
    hasPendingInvite: false,
    isCurrentUser: false,
    currentUserIsOrgAdmin: true,
  };

  describe('viewer is not org admin', () => {
    it('never shows invite or revoke (card and drawer)', () => {
      const member = { email: 'a@b.com', isAdmin: false };
      const result = getInviteAvailability(member, {
        ...baseContext,
        currentUserIsOrgAdmin: false,
      });
      expect(result.showInvite).toBe(false);
      expect(result.showRevoke).toBe(false);
    });
  });

  describe('super admin (owner)', () => {
    it('never shows invite or revoke for owner (card and drawer)', () => {
      const member = { email: 'owner@b.com', isAdmin: false, isOwner: true };
      const result = getInviteAvailability(member, baseContext);
      expect(result.showInvite).toBe(false);
      expect(result.showRevoke).toBe(false);
    });

    it('never shows invite or revoke even when owner has pending invite (card and drawer)', () => {
      const member = { email: 'owner@b.com', isAdmin: false, isOwner: true };
      const result = getInviteAvailability(member, {
        ...baseContext,
        hasPendingInvite: true,
      });
      expect(result.showInvite).toBe(false);
      expect(result.showRevoke).toBe(false);
    });
  });

  describe('org admin (team member is admin)', () => {
    it('never shows invite or revoke for admin member (card and drawer)', () => {
      const member = { email: 'admin@b.com', isAdmin: true };
      const result = getInviteAvailability(member, baseContext);
      expect(result.showInvite).toBe(false);
      expect(result.showRevoke).toBe(false);
    });
  });

  describe('member (non-admin, non-owner)', () => {
    it('shows Invite to join when not invited and no access (card and drawer)', () => {
      const member = { email: 'member@b.com', isAdmin: false };
      const result = getInviteAvailability(member, baseContext);
      expect(result.showInvite).toBe(true);
      expect(result.showRevoke).toBe(false);
    });

    it('shows Revoke access (not Invite) when member has pending invite (card and drawer)', () => {
      const member = { email: 'member@b.com', isAdmin: false };
      const result = getInviteAvailability(member, {
        ...baseContext,
        hasPendingInvite: true,
      });
      expect(result.showInvite).toBe(false);
      expect(result.showRevoke).toBe(true);
    });

    it('shows Revoke access (not Invite) when member has invitedAt and caller sets hasPendingInvite (card and drawer)', () => {
      const member = { email: 'member@b.com', isAdmin: false, invitedAt: '2025-01-01T00:00:00Z' };
      const result = getInviteAvailability(member, {
        ...baseContext,
        hasPendingInvite: true,
      });
      expect(result.showInvite).toBe(false);
      expect(result.showRevoke).toBe(true);
    });

    it('shows Revoke access (not Invite) when member already has access (card and drawer)', () => {
      const member = { email: 'member@b.com', isAdmin: false };
      const result = getInviteAvailability(member, {
        ...baseContext,
        hasAccess: true,
      });
      expect(result.showInvite).toBe(false);
      expect(result.showRevoke).toBe(true);
    });

    it('never shows invite or revoke for current user (self) (card and drawer)', () => {
      const member = { email: 'me@b.com', isAdmin: false };
      const result = getInviteAvailability(member, {
        ...baseContext,
        isCurrentUser: true,
      });
      expect(result.showInvite).toBe(false);
      expect(result.showRevoke).toBe(false);
    });

    it('shows exactly one of Invite or Revoke for a member (never both)', () => {
      const member = { email: 'member@b.com', isAdmin: false };
      expect(getInviteAvailability(member, baseContext)).toEqual({ showInvite: true, showRevoke: false });
      expect(getInviteAvailability(member, { ...baseContext, hasPendingInvite: true })).toEqual({
        showInvite: false,
        showRevoke: true,
      });
      expect(getInviteAvailability(member, { ...baseContext, hasAccess: true })).toEqual({
        showInvite: false,
        showRevoke: true,
      });
    });
  });
});
