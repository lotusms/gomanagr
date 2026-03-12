/**
 * Unit tests for services/userService.js: getUserAccount, updateUserTheme, updateDismissedTodos,
 * dismissTodo, updateTeamMembers, updateClients, updateServices, getOrgServices, updateOrgServices,
 * saveAppointment, deleteUserAccount, deleteAppointment, uploadFile, listStorageFiles,
 * getStoragePublicUrl, removeStorageFiles.
 */
import {
  getUserAccount,
  getUserAccountFromServer,
  updateUserTheme,
  updateDismissedTodos,
  dismissTodo,
  updateTeamMembers,
  updateClients,
  updateServices,
  getOrgServices,
  updateOrgServices,
  saveAppointment,
  deleteUserAccount,
  deleteAppointment,
  uploadFile,
  listStorageFiles,
  getStoragePublicUrl,
  removeStorageFiles,
} from '@/services/userService';

let profilesSelectResult = { data: null, error: null };
let profilesUpdateResult = { error: null };
let storageUploadResult = { data: { path: 'p/file.png' }, error: null };
let storageListResult = { data: [{ name: 'f1.png' }], error: null };
let storageRemoveResult = { error: null };

const mockFrom = jest.fn((table) => {
  if (table !== 'user_profiles') return {};
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve(profilesSelectResult),
        single: () => Promise.resolve(profilesSelectResult),
      }),
    }),
    update: (payload) => ({
      eq: (col, val) =>
        Promise.resolve(profilesUpdateResult),
    }),
  };
});

const mockStorageFrom = jest.fn((bucket) => ({
  upload: (path, file, opts) => Promise.resolve(storageUploadResult),
  getPublicUrl: (path) => ({ data: { publicUrl: `https://storage.example.com/${bucket}/${path}` } }),
  list: (prefix) => Promise.resolve(storageListResult),
  remove: (paths) => Promise.resolve(storageRemoveResult),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (t) => mockFrom(t),
    storage: {
      from: (bucket) => mockStorageFrom(bucket),
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
}));

global.fetch = jest.fn();

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    profilesSelectResult = { data: null, error: null };
    profilesUpdateResult = { error: null };
    storageUploadResult = { data: { path: 'p/file.png' }, error: null };
    storageListResult = { data: [{ name: 'f1.png' }], error: null };
    storageRemoveResult = { error: null };
  });

  describe('getUserAccount', () => {
    it('returns null when no profile (rowToAccount null)', async () => {
      profilesSelectResult = { data: null, error: null };
      const result = await getUserAccount('uid');
      expect(result).toBeNull();
    });

    it('returns account shape from row (rowToAccount)', async () => {
      profilesSelectResult = {
        data: {
          id: 'uid',
          email: 'u@b.com',
          first_name: 'Jane',
          last_name: 'Doe',
          created_at: '2020-01-01',
          updated_at: '2020-01-02',
        },
        error: null,
      };
      const result = await getUserAccount('uid');
      expect(result).toMatchObject({
        userId: 'uid',
        email: 'u@b.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });
    });

    it('returns null on offline/fetch error', async () => {
      profilesSelectResult = { data: null, error: { message: 'fetch failed', code: 'PGRST301' } };
      const result = await getUserAccount('uid');
      expect(result).toBeNull();
    });

    it('throws on other error', async () => {
      profilesSelectResult = { data: null, error: { message: 'DB error' } };
      await expect(getUserAccount('uid')).rejects.toThrow('Failed to get user account');
    });
  });

  describe('getUserAccountFromServer', () => {
    it('returns same as getUserAccount', async () => {
      profilesSelectResult = { data: { id: 'u1', email: 'a@b.com' }, error: null };
      const result = await getUserAccountFromServer('u1');
      expect(result).toMatchObject({ userId: 'u1', email: 'a@b.com' });
    });
  });

  describe('updateUserTheme', () => {
    it('throws on error', async () => {
      profilesUpdateResult = { error: { message: 'RLS denied' } };
      await expect(updateUserTheme('uid', 'palette2')).rejects.toThrow('Failed to save theme preference');
    });

    it('succeeds when no error', async () => {
      await expect(updateUserTheme('uid', 'palette2')).resolves.toBeUndefined();
    });
  });

  describe('updateDismissedTodos', () => {
    it('throws on error', async () => {
      profilesUpdateResult = { error: { message: 'Update failed' } };
      await expect(updateDismissedTodos('uid', ['t1'])).rejects.toThrow('Failed to save dismissed todos');
    });

    it('accepts non-array as empty list', async () => {
      await expect(updateDismissedTodos('uid', null)).resolves.toBeUndefined();
    });
  });

  describe('dismissTodo', () => {
    it('returns null when userId or todoId missing', async () => {
      expect(await dismissTodo('', 't1', [])).toBeNull();
      expect(await dismissTodo('uid', '', [])).toBeNull();
    });

    it('appends todoId and returns new list', async () => {
      const result = await dismissTodo('uid', 'todo-1', []);
      expect(result).toEqual(['todo-1']);
    });

    it('does not duplicate if already in list', async () => {
      const result = await dismissTodo('uid', 'todo-1', ['todo-1']);
      expect(result).toEqual(['todo-1']);
    });
  });

  describe('updateTeamMembers', () => {
    it('throws when profile check fails', async () => {
      profilesSelectResult = { data: null, error: { message: 'Not found' } };
      await expect(updateTeamMembers('uid', [])).rejects.toThrow('Profile not found or access denied');
    });

    it('throws when existingProfile is null', async () => {
      profilesSelectResult = { data: null, error: null };
      await expect(updateTeamMembers('uid', [])).rejects.toThrow('Profile not found for user');
    });

    it('succeeds when profile exists and update returns data', async () => {
      profilesSelectResult = { data: { id: 'uid' }, error: null };
      profilesUpdateResult = { error: null, data: [{}] };
      const supabase = require('@/lib/supabase').supabase;
      supabase.from = jest.fn((table) => {
        if (table !== 'user_profiles') return {};
        let callCount = 0;
        return {
          select: () => ({
            eq: () => ({
              single: () => {
                callCount++;
                return Promise.resolve(profilesSelectResult);
              },
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () =>
                Promise.resolve({ data: [{}], error: null }),
            }),
          }),
        };
      });
      await expect(updateTeamMembers('uid', [{ id: 'tm1' }])).resolves.toBeUndefined();
    });

    it('treats non-array teamMembers as empty list', async () => {
      profilesSelectResult = { data: { id: 'uid' }, error: null };
      const supabase = require('@/lib/supabase').supabase;
      supabase.from = jest.fn((table) => {
        if (table !== 'user_profiles') return {};
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve(profilesSelectResult) }) }),
          update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [{}], error: null }) }) }),
        };
      });
      await expect(updateTeamMembers('uid', null)).resolves.toBeUndefined();
    });
  });

  describe('updateClients', () => {
    it('cleans and updates clients', async () => {
      const supabase = require('@/lib/supabase').supabase;
      supabase.from = jest.fn(() => ({
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }));
      await expect(updateClients('uid', [{ id: 'c1', name: 'Client' }])).resolves.toBeUndefined();
    });

    it('treats non-array as empty', async () => {
      const supabase = require('@/lib/supabase').supabase;
      supabase.from = jest.fn(() => ({
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }));
      await expect(updateClients('uid', null)).resolves.toBeUndefined();
    });
  });

  describe('updateServices', () => {
    it('throws on error', async () => {
      const supabase = require('@/lib/supabase').supabase;
      supabase.from = jest.fn(() => ({
        update: () => ({ eq: () => Promise.resolve({ error: { message: 'Failed' } }) }),
      }));
      await expect(updateServices('uid', [])).rejects.toThrow('Failed to save services');
    });
  });

  describe('getOrgServices', () => {
    it('returns json on ok', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ services: [], teamMembers: [] }) });
      const result = await getOrgServices('org1', 'uid');
      expect(result).toMatchObject({ services: [], teamMembers: [] });
    });

    it('throws on !res.ok', async () => {
      global.fetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Forbidden' }), statusText: 'Forbidden' });
      await expect(getOrgServices('org1', 'uid')).rejects.toThrow('Forbidden');
    });
  });

  describe('updateOrgServices', () => {
    it('succeeds when res.ok', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      await expect(updateOrgServices('org1', 'uid', [], [])).resolves.toBeUndefined();
    });

    it('throws on !res.ok', async () => {
      global.fetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Failed' }) });
      await expect(updateOrgServices('org1', 'uid', [])).rejects.toThrow('Failed');
    });
  });

  describe('saveAppointment', () => {
    it('appends or updates appointment', async () => {
      const supabase = require('@/lib/supabase').supabase;
      let selectCalled = false;
      supabase.from = jest.fn(() => ({
        select: () => ({
          eq: () => ({
            single: () => {
              selectCalled = true;
              return Promise.resolve({ data: { appointments: [] }, error: null });
            },
          }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }));
      await expect(saveAppointment('uid', { id: 'apt1', title: 'Meet' })).resolves.toBeUndefined();
    });
  });

  describe('deleteUserAccount', () => {
    it('returns json on ok', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      const result = await deleteUserAccount('uid');
      expect(result).toEqual({});
    });

    it('throws on !response.ok', async () => {
      global.fetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({ message: 'Not allowed' }) });
      await expect(deleteUserAccount('uid')).rejects.toThrow('Not allowed');
    });
  });

  describe('deleteAppointment', () => {
    it('filters out appointment and updates', async () => {
      const supabase = require('@/lib/supabase').supabase;
      supabase.from = jest.fn(() => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { appointments: [{ id: 'apt1' }, { id: 'apt2' }] }, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }));
      await expect(deleteAppointment('uid', 'apt1')).resolves.toBeUndefined();
    });

    it('throws when user not found', async () => {
      const supabase = require('@/lib/supabase').supabase;
      supabase.from = jest.fn(() => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      }));
      await expect(deleteAppointment('uid', 'apt1')).rejects.toThrow('User account not found');
    });
  });

  describe('uploadFile', () => {
    it('returns public URL on success', async () => {
      const result = await uploadFile('bucket', 'path/f.png', new Blob());
      expect(result).toContain('bucket');
      expect(result).toMatch(/storage\.example\.com\/bucket\//);
    });

    it('throws on upload error', async () => {
      storageUploadResult = { data: null, error: { message: 'Upload failed' } };
      await expect(uploadFile('b', 'p', new Blob())).rejects.toMatchObject({ message: 'Upload failed' });
    });
  });

  describe('listStorageFiles', () => {
    it('returns paths from list', async () => {
      const result = await listStorageFiles('bucket', 'prefix');
      expect(result).toContain('prefix/f1.png');
    });

    it('uses empty prefix when not provided', async () => {
      const result = await listStorageFiles('bucket');
      expect(result).toContain('f1.png');
    });
  });

  describe('getStoragePublicUrl', () => {
    it('returns public URL', () => {
      const url = getStoragePublicUrl('bucket', 'path/file.png');
      expect(url).toBe('https://storage.example.com/bucket/path/file.png');
    });
  });

  describe('removeStorageFiles', () => {
    it('calls remove and does not throw on success', async () => {
      await expect(removeStorageFiles('bucket', ['p1', 'p2'])).resolves.toBeUndefined();
    });

    it('does nothing when paths empty', async () => {
      await expect(removeStorageFiles('bucket', [])).resolves.toBeUndefined();
      expect(mockStorageFrom).not.toHaveBeenCalled();
    });

    it('throws on remove error', async () => {
      storageRemoveResult = { error: { message: 'Remove failed' } };
      await expect(removeStorageFiles('bucket', ['p1'])).rejects.toMatchObject({ message: 'Remove failed' });
    });
  });
});
