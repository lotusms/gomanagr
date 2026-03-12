/**
 * Unit tests for lib/teamMemberSave.js: cleanTeamMember, generateId, persistTeam
 */
import { cleanTeamMember, generateId, persistTeam } from '@/lib/teamMemberSave';

const mockUpdateTeamMembers = jest.fn().mockResolvedValue(undefined);

jest.mock('@/services/userService', () => ({
  updateTeamMembers: (...args) => mockUpdateTeamMembers(...args),
}));

describe('teamMemberSave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('cleanTeamMember', () => {
    it('omits keys with undefined value', () => {
      expect(cleanTeamMember({ a: 1, b: undefined, c: 'x' })).toEqual({ a: 1, c: 'x' });
    });

    it('keeps primitives and arrays as-is', () => {
      expect(cleanTeamMember({ n: 0, s: '', arr: [1, 2] })).toEqual({ n: 0, s: '', arr: [1, 2] });
    });

    it('cleans nested objects and omits undefined nested keys', () => {
      const member = {
        id: '1',
        profile: { name: 'Jane', title: undefined, active: true },
      };
      expect(cleanTeamMember(member)).toEqual({
        id: '1',
        profile: { name: 'Jane', active: true },
      });
    });

    it('omits nested object when all nested values are undefined', () => {
      const member = { id: '1', profile: { a: undefined, b: undefined } };
      expect(cleanTeamMember(member)).toEqual({ id: '1' });
    });

    it('includes nested object when it has at least one defined value', () => {
      const member = { profile: { a: undefined, b: 2 } };
      expect(cleanTeamMember(member)).toEqual({ profile: { b: 2 } });
    });
  });

  describe('generateId', () => {
    it('returns string starting with tm- and contains timestamp and random segment', () => {
      const id = generateId();
      expect(id).toMatch(/^tm-\d+-[a-z0-9]+$/);
      expect(id.startsWith('tm-')).toBe(true);
    });

    it('returns unique values on multiple calls', () => {
      const ids = new Set([generateId(), generateId(), generateId()]);
      expect(ids.size).toBe(3);
    });
  });

  describe('persistTeam', () => {
    it('uses updateTeamMembers when ownerUserId or organization.id is missing', async () => {
      await persistTeam([{ id: '1', name: 'A' }], { currentUserId: 'uid' });
      expect(mockUpdateTeamMembers).toHaveBeenCalledWith('uid', [{ id: '1', name: 'A' }]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('calls fetch /api/update-org-team when ownerUserId and organization.id are set', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      await persistTeam(
        [{ id: '1', name: 'A' }],
        {
          currentUserId: 'uid',
          organization: { id: 'org-1' },
          ownerUserId: 'owner-1',
        }
      );
      expect(fetch).toHaveBeenCalledWith('/api/update-org-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org-1',
          callerUserId: 'uid',
          teamMembers: [{ id: '1', name: 'A' }],
        }),
      });
      expect(mockUpdateTeamMembers).not.toHaveBeenCalled();
    });

    it('throws with response error message when res.ok is false', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Not allowed' }),
      });
      await expect(
        persistTeam([], {
          currentUserId: 'uid',
          organization: { id: 'org-1' },
          ownerUserId: 'owner-1',
        })
      ).rejects.toThrow('Not allowed');
    });

    it('throws generic message when res.json fails or error is missing', async () => {
      global.fetch.mockResolvedValue({ ok: false, json: () => Promise.reject(new Error('parse')) });
      await expect(
        persistTeam([], {
          currentUserId: 'uid',
          organization: { id: 'org-1' },
          ownerUserId: 'owner-1',
        })
      ).rejects.toThrow('Failed to update team');
    });

    it('calls setOwnerTeamMembers and setTeam with list when org path succeeds', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      const setOwnerTeamMembers = jest.fn();
      const setTeam = jest.fn();
      await persistTeam([{ id: '1', status: 'active' }], {
        currentUserId: 'uid',
        organization: { id: 'org-1' },
        ownerUserId: 'owner-1',
        setOwnerTeamMembers,
        setTeam,
      });
      expect(setOwnerTeamMembers).toHaveBeenCalledWith([{ id: '1', status: 'active' }]);
      expect(setTeam).toHaveBeenCalledWith([{ id: '1', status: 'active' }]);
    });

    it('filters inactive when showInactive is false (org path)', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      const setTeam = jest.fn();
      await persistTeam(
        [
          { id: '1', status: 'active' },
          { id: '2', status: 'inactive' },
        ],
        {
          currentUserId: 'uid',
          organization: { id: 'org-1' },
          ownerUserId: 'owner-1',
          setTeam,
          showInactive: false,
        }
      );
      expect(setTeam).toHaveBeenCalledWith([{ id: '1', status: 'active' }]);
    });

    it('includes inactive when showInactive is true (org path)', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      const setTeam = jest.fn();
      await persistTeam(
        [{ id: '1', status: 'inactive' }],
        {
          currentUserId: 'uid',
          organization: { id: 'org-1' },
          ownerUserId: 'owner-1',
          setTeam,
          showInactive: true,
        }
      );
      expect(setTeam).toHaveBeenCalledWith([{ id: '1', status: 'inactive' }]);
    });

    it('calls broadcastTeamUpdated when provided (org path)', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      const broadcastTeamUpdated = jest.fn();
      await persistTeam([], {
        currentUserId: 'uid',
        organization: { id: 'org-1' },
        ownerUserId: 'owner-1',
        broadcastTeamUpdated,
      });
      expect(broadcastTeamUpdated).toHaveBeenCalledTimes(1);
    });

    it('updates setUserAccount with teamMembers when not org path', async () => {
      const setUserAccount = jest.fn();
      await persistTeam([{ id: '1', name: 'A' }], {
        currentUserId: 'uid',
        setUserAccount,
      });
      expect(mockUpdateTeamMembers).toHaveBeenCalledWith('uid', [{ id: '1', name: 'A' }]);
      expect(setUserAccount).toHaveBeenCalledTimes(1);
      const updater = setUserAccount.mock.calls[0][0];
      expect(updater({ uid: 'u', teamMembers: [] })).toEqual({ uid: 'u', teamMembers: [{ id: '1', name: 'A' }] });
    });

    it('setUserAccount updater returns null when prev is null', async () => {
      const setUserAccount = jest.fn();
      await persistTeam([{ id: '1' }], { currentUserId: 'uid', setUserAccount });
      const updater = setUserAccount.mock.calls[0][0];
      expect(updater(null)).toBeNull();
    });

    it('filters inactive when showInactive is false (user path)', async () => {
      const setTeam = jest.fn();
      await persistTeam(
        [
          { id: '1', status: 'active' },
          { id: '2', status: 'inactive' },
        ],
        { currentUserId: 'uid', setTeam, showInactive: false }
      );
      expect(setTeam).toHaveBeenCalledWith([{ id: '1', status: 'active' }]);
    });

    it('calls broadcastTeamUpdated when provided (user path)', async () => {
      const broadcastTeamUpdated = jest.fn();
      await persistTeam([], { currentUserId: 'uid', broadcastTeamUpdated });
      expect(broadcastTeamUpdated).toHaveBeenCalledTimes(1);
    });

    it('treats non-array cleanedTeam as empty list', async () => {
      await persistTeam(null, { currentUserId: 'uid' });
      expect(mockUpdateTeamMembers).toHaveBeenCalledWith('uid', []);
    });

    it('cleans each member before persisting', async () => {
      await persistTeam([{ id: '1', name: 'A', skip: undefined }], { currentUserId: 'uid' });
      expect(mockUpdateTeamMembers).toHaveBeenCalledWith('uid', [{ id: '1', name: 'A' }]);
    });
  });
});
