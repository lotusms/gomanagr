/**
 * Unit tests for services/organizationService.js
 */
import {
  getUserOrganization,
  getUserOrganizations,
  createOrganization,
  addUserToOrganization,
  updateUserRole,
  removeUserFromOrganization,
  getOrganizationMembers,
  updateOrganization,
} from '@/services/organizationService';

let orgMembersResult = { data: null, error: null };
let orgInsertResult = { data: null, error: null };
let orgMembersInsertResult = { data: null, error: null };
let orgMembersUpdateResult = { data: null, error: null };
let orgMembersDeleteResult = { error: null };
let orgUpdateResult = { data: null, error: null };
let orgMembersSelectSingleResult = { data: null, error: null };

const orgMembersOrderReturn = {
  limit: () => ({ maybeSingle: () => Promise.resolve(orgMembersResult) }),
  then: (resolve, reject) => Promise.resolve(orgMembersResult).then(resolve, reject),
  catch: (fn) => Promise.resolve(orgMembersResult).catch(fn),
};

function from(table) {
  if (table === 'org_members') {
    return {
      select: () => ({
        eq: (col, val) => ({
          eq: (c2, v2) => ({ single: () => Promise.resolve(orgMembersSelectSingleResult) }),
          order: () => orgMembersOrderReturn,
        }),
      }),
      insert: (payload) => ({
        select: () => ({ single: () => Promise.resolve(orgMembersInsertResult) }),
      }),
      update: (payload) => ({
        eq: () => ({
          eq: () => ({ select: () => ({ single: () => Promise.resolve(orgMembersUpdateResult) }) }),
        }),
      }),
      delete: () => ({
        eq: () => ({ eq: () => Promise.resolve(orgMembersDeleteResult) }),
      }),
    };
  }
  if (table === 'organizations') {
    return {
      insert: (payload) => ({
        select: () => ({ single: () => Promise.resolve(orgInsertResult) }),
      }),
      update: (payload) => ({
        eq: () => ({ select: () => Promise.resolve(orgUpdateResult) }),
      }),
    };
  }
  return {};
}

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (table) => from(table) },
}));

describe('organizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    orgMembersResult = { data: null, error: null };
    orgInsertResult = { data: null, error: null };
    orgMembersInsertResult = { data: null, error: null };
    orgMembersUpdateResult = { data: null, error: null };
    orgMembersDeleteResult = { error: null };
    orgUpdateResult = { data: null, error: null };
    orgMembersSelectSingleResult = { data: null, error: null };
  });

  describe('getUserOrganization', () => {
    it('returns null when no membership', async () => {
      orgMembersResult = { data: null, error: null };
      const result = await getUserOrganization('uid');
      expect(result).toBeNull();
    });

    it('returns organization with membership shape', async () => {
      orgMembersResult = {
        data: {
          id: 'mem1',
          role: 'admin',
          created_at: '2020-01-01',
          updated_at: '2020-01-02',
          organization: { id: 'org1', name: 'Acme' },
        },
        error: null,
      };
      const result = await getUserOrganization('uid');
      expect(result).toMatchObject({ id: 'org1', name: 'Acme' });
      expect(result.membership).toEqual({
        id: 'mem1',
        role: 'admin',
        createdAt: '2020-01-01',
        updatedAt: '2020-01-02',
      });
    });

    it('throws on error', async () => {
      orgMembersResult = { data: null, error: { message: 'DB error' } };
      await expect(getUserOrganization('uid')).rejects.toMatchObject({ message: 'DB error' });
    });
  });

  describe('getUserOrganizations', () => {
    it('returns mapped array of orgs with membership', async () => {
      orgMembersResult = {
        data: [
          {
            id: 'm1',
            role: 'member',
            created_at: '2020-01-01',
            updated_at: '2020-01-02',
            organization: { id: 'org1', name: 'Org 1' },
          },
        ],
        error: null,
      };
      const result = await getUserOrganizations('uid');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'org1', name: 'Org 1' });
      expect(result[0].membership.role).toBe('member');
    });

    it('returns empty array when data is null', async () => {
      orgMembersResult = { data: null, error: null };
      const result = await getUserOrganizations('uid');
      expect(result).toEqual([]);
    });
  });

  describe('createOrganization', () => {
    it('inserts org with defaults and returns data', async () => {
      const created = { id: 'org1', name: 'New Org', trial: true };
      orgInsertResult = { data: created, error: null };
      const result = await createOrganization({ name: 'New Org' });
      expect(result).toEqual(created);
    });

    it('passes optional fields and selected_palette default', async () => {
      const created = { id: 'org2', name: 'N', selected_palette: 'palette2' };
      orgInsertResult = { data: created, error: null };
      const result = await createOrganization({
        name: 'N',
        logo_url: 'https://x.com/logo.png',
        industry: 'Tech',
        sections_to_track: ['a'],
        trial: false,
        selected_palette: 'palette2',
      });
      expect(result).toEqual(created);
    });

    it('throws on error', async () => {
      orgInsertResult = { data: null, error: { message: 'Insert failed' } };
      await expect(createOrganization({ name: 'N' })).rejects.toMatchObject({ message: 'Insert failed' });
    });
  });

  describe('addUserToOrganization', () => {
    it('throws for invalid role', async () => {
      await expect(addUserToOrganization('org1', 'uid', 'owner')).rejects.toThrow('Invalid role');
    });

    it('inserts and returns member on success', async () => {
      const member = { id: 'm1', user_id: 'uid', role: 'member' };
      orgMembersInsertResult = { data: member, error: null };
      const result = await addUserToOrganization('org1', 'uid', 'member');
      expect(result).toEqual(member);
    });

    it('returns existing member on 23505 conflict', async () => {
      orgMembersInsertResult = { data: null, error: { code: '23505' } };
      const existing = { id: 'm1', user_id: 'uid', organization_id: 'org1' };
      orgMembersSelectSingleResult = { data: existing, error: null };
      const result = await addUserToOrganization('org1', 'uid', 'member');
      expect(result).toEqual(existing);
      orgMembersSelectSingleResult = { data: null, error: null };
    });
  });

  describe('updateUserRole', () => {
    it('throws for invalid role', async () => {
      await expect(updateUserRole('org1', 'uid', 'owner')).rejects.toThrow('Invalid role');
    });

    it('updates and returns member', async () => {
      const updated = { id: 'm1', role: 'admin' };
      orgMembersUpdateResult = { data: updated, error: null };
      const result = await updateUserRole('org1', 'uid', 'admin');
      expect(result).toEqual(updated);
    });
  });

  describe('removeUserFromOrganization', () => {
    it('succeeds when delete returns no error', async () => {
      await expect(removeUserFromOrganization('org1', 'uid')).resolves.toBeUndefined();
    });

    it('throws on delete error', async () => {
      orgMembersDeleteResult = { error: { message: 'Delete failed' } };
      await expect(removeUserFromOrganization('org1', 'uid')).rejects.toMatchObject({ message: 'Delete failed' });
    });
  });

  describe('getOrganizationMembers', () => {
    it('returns data or empty array', async () => {
      orgMembersResult = { data: [{ id: 'm1', user: {} }], error: null };
      const result = await getOrganizationMembers('org1');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'm1' });
    });

    it('returns empty array when data is null', async () => {
      orgMembersResult = { data: null, error: null };
      const result = await getOrganizationMembers('org1');
      expect(result).toEqual([]);
    });
  });

  describe('updateOrganization', () => {
    it('returns first row when update returns array', async () => {
      const row = { id: 'org1', name: 'Updated' };
      orgUpdateResult = { data: [row], error: null };
      const result = await updateOrganization('org1', { name: 'Updated' });
      expect(result).toEqual(row);
    });

    it('throws when no row returned', async () => {
      orgUpdateResult = { data: [], error: null };
      await expect(updateOrganization('org1', { name: 'X' })).rejects.toThrow(
        'Organization not found or update did not return a row'
      );
    });

    it('throws when data is not array', async () => {
      orgUpdateResult = { data: null, error: null };
      await expect(updateOrganization('org1', { name: 'X' })).rejects.toThrow('Organization not found');
    });
  });
});
