/**
 * Unit tests for services/inviteService.js
 */
import { createInvite, getInviteByToken, getOrganizationInvites, revokeInvite, getInviteLink } from '@/services/inviteService';

let insertPayload = null;
let selectResult = { data: null, error: null };
let deleteResult = { error: null };

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: (payload) => {
        insertPayload = payload;
        return { select: () => ({ single: () => Promise.resolve(selectResult) }) };
      },
      select: () => ({
        eq: () => ({
          eq: () => ({ single: () => Promise.resolve(selectResult) }),
          order: () => Promise.resolve(selectResult),
        }),
      }),
      delete: () => ({ eq: () => Promise.resolve(deleteResult) }),
    }),
  },
}));

describe('inviteService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    insertPayload = null;
    selectResult = { data: null, error: null };
    deleteResult = { error: null };
  });

  describe('createInvite', () => {
    it('throws for invalid role', async () => {
      await expect(createInvite('org1', 'a@b.com', 'owner', 'uid')).rejects.toThrow(
        "Invalid role: owner. Must be 'admin', 'developer', or 'member'"
      );
    });

    it('inserts invite with normalized email and default role', async () => {
      const created = { id: 'inv1', email: 'a@b.com', role: 'member', token: 't1' };
      selectResult = { data: created, error: null };
      const result = await createInvite('org1', '  A@B.COM  ', 'member', 'uid');
      expect(result).toEqual(created);
      expect(insertPayload).toMatchObject({
        organization_id: 'org1',
        email: 'a@b.com',
        role: 'member',
        invited_by: 'uid',
        used: false,
      });
    });

    it('uses custom expiresAt when provided', async () => {
      const exp = new Date('2025-12-31');
      selectResult = { data: {}, error: null };
      await createInvite('org1', 'a@b.com', 'admin', 'uid', exp);
      expect(insertPayload.expires_at).toBe(exp.toISOString());
    });

    it('throws on supabase error', async () => {
      selectResult = { data: null, error: { message: 'DB error' } };
      await expect(createInvite('org1', 'a@b.com', 'member', 'uid')).rejects.toMatchObject({ message: 'DB error' });
    });
  });

  describe('getInviteByToken', () => {
    it('returns null when PGRST116 (not found)', async () => {
      selectResult = { data: null, error: { code: 'PGRST116' } };
      const result = await getInviteByToken('bad-token');
      expect(result).toBeNull();
    });

    it('returns null when invite is expired', async () => {
      selectResult = {
        data: { token: 't1', expires_at: '2020-01-01T00:00:00.000Z', used: false },
        error: null,
      };
      const result = await getInviteByToken('t1');
      expect(result).toBeNull();
    });

    it('returns invite when valid and not expired', async () => {
      const invite = { token: 't1', expires_at: '2030-01-01T00:00:00.000Z', used: false };
      selectResult = { data: invite, error: null };
      const result = await getInviteByToken('t1');
      expect(result).toEqual(invite);
    });

    it('throws on other supabase error', async () => {
      selectResult = { data: null, error: { message: 'Network error' } };
      await expect(getInviteByToken('t1')).rejects.toMatchObject({ message: 'Network error' });
    });
  });

  describe('getOrganizationInvites', () => {
    it('returns data array', async () => {
      selectResult = { data: [{ id: '1' }], error: null };
      const result = await getOrganizationInvites('org1');
      expect(result).toEqual([{ id: '1' }]);
    });

    it('returns empty array when data is null', async () => {
      selectResult = { data: null, error: null };
      const result = await getOrganizationInvites('org1');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      selectResult = { data: null, error: { message: 'DB error' } };
      await expect(getOrganizationInvites('org1')).rejects.toMatchObject({ message: 'DB error' });
    });
  });

  describe('revokeInvite', () => {
    it('calls delete and does not throw on success', async () => {
      await expect(revokeInvite('inv1')).resolves.toBeUndefined();
    });

    it('throws on delete error', async () => {
      deleteResult = { error: { message: 'Delete failed' } };
      await expect(revokeInvite('inv1')).rejects.toMatchObject({ message: 'Delete failed' });
    });
  });

  describe('getInviteLink', () => {
    it('returns URL with token', () => {
      if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'location', { value: { origin: 'https://app.example.com' }, writable: true });
        expect(getInviteLink('abc123')).toBe('https://app.example.com/accept-invite?invite=abc123');
      } else {
        expect(getInviteLink('abc123')).toContain('/accept-invite?invite=abc123');
      }
    });
  });
});
