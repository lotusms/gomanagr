/**
 * Unit tests for lib/apiAuth.js: getAuthenticatedUserId
 */
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUserId } from '@/lib/apiAuth';

const mockGetUser = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((url, key, opts) => ({
    auth: {
      getUser: (token) => mockGetUser(token),
    },
  })),
}));

const originalEnv = process.env;

describe('apiAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAuthenticatedUserId', () => {
    it('returns null when Authorization header is missing', async () => {
      const req = { headers: {} };
      await expect(getAuthenticatedUserId(req)).resolves.toBe(null);
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('returns null when Authorization is not a string', async () => {
      const req = { headers: { authorization: 123 } };
      await expect(getAuthenticatedUserId(req)).resolves.toBe(null);
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('returns null when Authorization does not start with Bearer', async () => {
      const req = { headers: { authorization: 'Basic xyz' } };
      await expect(getAuthenticatedUserId(req)).resolves.toBe(null);
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('accepts Bearer with any case', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const req = { headers: { authorization: 'BEARER token123' } };
      await expect(getAuthenticatedUserId(req)).resolves.toBe('u1');
      expect(mockGetUser).toHaveBeenCalledWith('token123');
    });

    it('returns null when token is empty after Bearer', async () => {
      const req = { headers: { authorization: 'Bearer   ' } };
      await expect(getAuthenticatedUserId(req)).resolves.toBe(null);
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('returns user id when getUser succeeds', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-123' } }, error: null });
      const req = { headers: { authorization: 'Bearer jwt-here' } };
      await expect(getAuthenticatedUserId(req)).resolves.toBe('uid-123');
      expect(mockGetUser).toHaveBeenCalledWith('jwt-here');
    });

    it('returns null when getUser returns error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });
      const req = { headers: { authorization: 'Bearer bad' } };
      await expect(getAuthenticatedUserId(req)).resolves.toBe(null);
    });

    it('returns null when getUser returns no user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const req = { headers: { authorization: 'Bearer x' } };
      await expect(getAuthenticatedUserId(req)).resolves.toBe(null);
    });

    it('returns null when user has no id', async () => {
      mockGetUser.mockResolvedValue({ data: { user: {} }, error: null });
      const req = { headers: { authorization: 'Bearer x' } };
      await expect(getAuthenticatedUserId(req)).resolves.toBe(null);
    });

    it('returns null when getUser throws', async () => {
      mockGetUser.mockRejectedValue(new Error('Network error'));
      const req = { headers: { authorization: 'Bearer x' } };
      await expect(getAuthenticatedUserId(req)).resolves.toBe(null);
    });

    it('returns null when env is missing (getAnon returns null)', async () => {
      const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      jest.resetModules();
      const { getAuthenticatedUserId: getUserId } = await import('@/lib/apiAuth');
      const req = { headers: { authorization: 'Bearer token' } };
      await expect(getUserId(req)).resolves.toBe(null);
      expect(createClient).not.toHaveBeenCalled();
      process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      jest.resetModules();
    });
  });
});
