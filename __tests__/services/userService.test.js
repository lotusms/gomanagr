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
  uploadTeamPhoto,
  listStorageFiles,
  getStoragePublicUrl,
  removeStorageFiles,
} from '@/services/userService';

let profilesSelectResult = { data: null, error: null };
let profilesUpdateResult = { error: null };
let storageUploadResult = { data: { path: 'p/file.png' }, error: null };
let storageListResult = { data: [{ name: 'f1.png' }], error: null };
let storageRemoveResult = { error: null };

const defaultFromImpl = (table) => {
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
};
const mockFrom = jest.fn(defaultFromImpl);

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
    mockFrom.mockImplementation(defaultFromImpl);
    const { supabase } = require('@/lib/supabase');
    supabase.from = (t) => mockFrom(t);
    supabase.auth.getSession = jest.fn().mockResolvedValue({ data: { session: null } });
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

    it('auto-creates account when not found and session has email', async () => {
      profilesSelectResult = { data: null, error: null };
      const supabase = require('@/lib/supabase').supabase;
      supabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: { user: { email: 'new@example.com', user_metadata: { firstName: 'New', lastName: 'User' } } } },
      });
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      let callCount = 0;
      mockFrom.mockImplementation((table) => {
        if (table !== 'user_profiles') return {};
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => {
                callCount++;
                if (callCount === 1) return Promise.resolve({ data: null, error: null });
                return Promise.resolve({
                  data: { id: 'uid', email: 'new@example.com', first_name: 'New', last_name: 'User', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                  error: null,
                });
              },
            }),
          }),
        };
      });
      const result = await getUserAccount('uid');
      expect(result).toMatchObject({ userId: 'uid', email: 'new@example.com', firstName: 'New', lastName: 'User' });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/fix-missing-account',
        expect.objectContaining({ method: 'POST', body: expect.any(String) })
      );
      mockFrom.mockImplementation(defaultFromImpl);
      supabase.auth.getSession = jest.fn().mockResolvedValue({ data: { session: null } });
    });

    it('returns null when auto-create attempted but no email in session', async () => {
      profilesSelectResult = { data: null, error: null };
      const supabase = require('@/lib/supabase').supabase;
      supabase.auth.getSession = jest.fn().mockResolvedValue({ data: { session: { user: {} } } });
      const result = await getUserAccount('uid');
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
      supabase.auth.getSession = jest.fn().mockResolvedValue({ data: { session: null } });
    });

    it('returns null when auto-create fetch not ok', async () => {
      profilesSelectResult = { data: null, error: null };
      const supabase = require('@/lib/supabase').supabase;
      supabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: { user: { email: 'a@b.com' } } },
      });
      global.fetch = jest.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('Server error') });
      const result = await getUserAccount('uid');
      expect(result).toBeNull();
      supabase.auth.getSession = jest.fn().mockResolvedValue({ data: { session: null } });
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

    it('throws when update returns error with RLS/code 42501', async () => {
      profilesSelectResult = { data: { id: 'uid' }, error: null };
      const supabase = require('@/lib/supabase').supabase;
      supabase.from = jest.fn((table) => {
        if (table !== 'user_profiles') return {};
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve(profilesSelectResult) }) }),
          update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'new row violates row-level security', code: '42501' } }) }) }),
        };
      });
      await expect(updateTeamMembers('uid', [])).rejects.toThrow('Failed to save team members');
    });

    it('throws when update returns no rows', async () => {
      profilesSelectResult = { data: { id: 'uid' }, error: null };
      const supabase = require('@/lib/supabase').supabase;
      supabase.from = jest.fn((table) => {
        if (table !== 'user_profiles') return {};
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve(profilesSelectResult) }) }),
          update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) }),
        };
      });
      await expect(updateTeamMembers('uid', [])).rejects.toThrow('no rows were returned');
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

    it('throws on supabase update error', async () => {
      const supabase = require('@/lib/supabase').supabase;
      supabase.from = jest.fn(() => ({
        update: () => ({ eq: () => Promise.resolve({ error: { message: 'RLS denied' } }) }),
      }));
      await expect(updateClients('uid', [{ id: 'c1' }])).rejects.toThrow('Failed to save clients');
    });

    it('cleans empty strings and sparse arrays via cleanClient', async () => {
      const supabase = require('@/lib/supabase').supabase;
      supabase.from = jest.fn(() => ({
        update: (payload) => {
          expect(payload.clients).toBeDefined();
          expect(Array.isArray(payload.clients)).toBe(true);
          return { eq: () => Promise.resolve({ error: null }) };
        },
      }));
      await expect(updateClients('uid', [{ id: 'c1', name: 'A', emptyStr: '', arr: [null, 'x', ''] }])).resolves.toBeUndefined();
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

    it('throws with statusText when !res.ok and res.json() rejects', async () => {
      global.fetch.mockResolvedValue({ ok: false, json: () => Promise.reject(new Error('Invalid JSON')), statusText: 'Server Error' });
      await expect(getOrgServices('org1', 'uid')).rejects.toThrow('Server Error');
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

    it('throws with statusText when !res.ok and res.json() rejects', async () => {
      global.fetch.mockResolvedValue({ ok: false, json: () => Promise.reject(new Error('Parse error')), statusText: 'Bad Gateway' });
      await expect(updateOrgServices('org1', 'uid', [])).rejects.toThrow('Bad Gateway');
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

    it('throws with text when !response.ok and response.json() throws', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
        text: () => Promise.resolve('Server error body'),
      });
      await expect(deleteUserAccount('uid')).rejects.toThrow('Server error body');
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

  describe('uploadTeamPhoto', () => {
    let FileReaderBackup;
    beforeEach(() => {
      FileReaderBackup = global.FileReader;
      global.FileReader = jest.fn().mockImplementation(function () {
        this.readAsDataURL = jest.fn(function () {
          const self = this;
          setTimeout(() => {
            self.result = 'data:image/png;base64,dGVzdA==';
            self.onloadend?.();
          }, 0);
        });
      });
    });
    afterEach(() => {
      global.FileReader = FileReaderBackup;
    });

    it('returns photoUrl on success', async () => {
      const mockFile = new Blob(['x'], { type: 'image/png' });
      Object.defineProperty(mockFile, 'name', { value: 'photo.png' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ photoUrl: 'https://cdn.example.com/team/photo.png' }),
      });
      const result = await uploadTeamPhoto('uid', 'member-1', mockFile);
      expect(result).toBe('https://cdn.example.com/team/photo.png');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upload-team-photo',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        })
      );
    });

    it('throws when API returns !response.ok with error message', async () => {
      const mockFile = new Blob(['x'], { type: 'image/png' });
      Object.defineProperty(mockFile, 'name', { value: 'p.png' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 413,
        statusText: 'Payload Too Large',
        json: () => Promise.resolve({ error: 'File too large' }),
      });
      await expect(uploadTeamPhoto('uid', 'm1', mockFile)).rejects.toThrow('File too large');
    });

    it('throws with text when !response.ok and response.json() throws', async () => {
      const mockFile = new Blob(['x'], { type: 'image/png' });
      Object.defineProperty(mockFile, 'name', { value: 'p.png' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
        text: () => Promise.resolve('Internal error'),
      });
      await expect(uploadTeamPhoto('uid', 'm1', mockFile)).rejects.toThrow('Internal error');
    });

    it('throws when fetch fails', async () => {
      const mockFile = new Blob(['x'], { type: 'image/png' });
      Object.defineProperty(mockFile, 'name', { value: 'p.png' });
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      await expect(uploadTeamPhoto('uid', 'm1', mockFile)).rejects.toThrow('Failed to upload team photo');
    });
  });
});
