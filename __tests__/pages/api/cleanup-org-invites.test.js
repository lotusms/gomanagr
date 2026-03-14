/**
 * Unit tests for cleanup-org-invites API:
 * - GET/POST allowed; 405 for other methods
 * - 503 when Supabase unavailable
 * - 401 when no cron secret and no valid Bearer
 * - 403 when Bearer valid but user not superadmin/developer
 * - 200 deleted: 0 when no invites to clean
 * - 500 when select or delete fails
 * - 200 deleted: n when authorized by cron secret
 * - 200 deleted: n when authorized by Bearer (superadmin)
 */

const mockFrom = jest.fn();
const mockAuthGetUser = jest.fn();

const mockCreateClient = jest.fn((url, key) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (key === anonKey) {
    return {
      auth: {
        getUser: mockAuthGetUser,
      },
    };
  }
  if (key === serviceKey) {
    return { from: mockFrom };
  }
  return { from: mockFrom };
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

function mockRes() {
  return {
    status: jest.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (data) {
      this._json = data;
      return this;
    }),
  };
}

describe('cleanup-org-invites API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.INVITE_CLEANUP_SECRET;
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { role: 'superadmin' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === 'org_invites') {
        return {
          select: () => ({
            or: () => Promise.resolve({
              data: [{ id: 'inv-1' }, { id: 'inv-2' }],
              error: null,
            }),
          }),
          delete: () => ({
            in: () => Promise.resolve({ error: null }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-GET/non-POST', async () => {
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({ method: 'PUT', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      headers: { 'x-cron-secret': 'secret' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 401 when no cron secret and no valid Bearer', async () => {
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Unauthorized',
        message: expect.stringContaining('Bearer'),
      })
    );
  });

  it('returns 401 when Bearer token invalid', async () => {
    mockAuthGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid' } });
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer bad-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when Bearer user is not superadmin or developer', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { role: 'member' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Forbidden',
        message: expect.stringContaining('superadmin'),
      })
    );
  });

  it('returns 200 deleted: 0 when no invites to clean', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    mockFrom.mockImplementation((table) => {
      if (table === 'org_invites') {
        return {
          select: () => ({
            or: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      headers: { 'x-cron-secret': 'cron-secret' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deleted: 0, message: 'No invites to clean up' });
  });

  it('returns 500 when select fails', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    mockFrom.mockImplementation((table) => {
      if (table === 'org_invites') {
        return {
          select: () => ({
            or: () => Promise.resolve({ data: null, error: { message: 'select failed' } }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      headers: { 'x-cron-secret': 'cron-secret' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to list invites',
        details: 'select failed',
      })
    );
  });

  it('returns 500 when delete fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.CRON_SECRET = 'cron-secret';
    mockFrom.mockImplementation((table) => {
      if (table === 'org_invites') {
        return {
          select: () => ({
            or: () => Promise.resolve({
              data: [{ id: 'inv-1' }],
              error: null,
            }),
          }),
          delete: () => ({
            in: () => Promise.resolve({ error: { message: 'delete failed' } }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      headers: { 'x-cron-secret': 'cron-secret' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to delete invites',
        details: 'delete failed',
      })
    );
    consoleErrorSpy.mockRestore();
  });

  it('returns 200 deleted: n when authorized by x-cron-secret', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      headers: { 'x-cron-secret': 'cron-secret' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deleted: 2 });
  });

  it('returns 200 deleted: n when authorized by Bearer token (superadmin)', async () => {
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deleted: 2 });
  });

  it('allows cron secret via Authorization Bearer', async () => {
    process.env.CRON_SECRET = 'my-cron-secret';
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer my-cron-secret' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deleted: 2 });
  });

  it('allows developer role to run cleanup', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { role: 'developer' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === 'org_invites') {
        return {
          select: () => ({
            or: () => Promise.resolve({
              data: [{ id: 'inv-1' }],
              error: null,
            }),
          }),
          delete: () => ({
            in: () => Promise.resolve({ error: null }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/cleanup-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deleted: 1 });
  });
});
