/**
 * Unit tests for revoke-org-member API.
 * POST only; 503, 400 (missing email/userId, missing org/caller, cannot revoke self),
 * 403 caller not admin, 500 delete org_members/deleteUser, 200 success.
 */

const mockFrom = jest.fn();
const mockListUsers = jest.fn();
const mockDeleteUser = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        listUsers: mockListUsers,
        deleteUser: mockDeleteUser,
      },
    },
  }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return {
    status: jest.fn(function (c) {
      this.statusCode = c;
      return this;
    }),
    json: jest.fn(function (d) {
      this._json = d;
      return this;
    }),
  };
}

describe('revoke-org-member API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sent: true }),
    });
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'target-1', email: 'member@test.com' }] },
      error: null,
    });
    mockDeleteUser.mockResolvedValue({ error: null });
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { role: 'admin' },
                    error: null,
                  }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { email: 'member@test.com' },
                  error: null,
                }),
            }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (t === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { name: 'Test Org' }, error: null }),
            }),
          }),
        };
      }
      if (t === 'org_invites') {
        return {
          delete: () => ({
            eq: () => ({
              ilike: () => Promise.resolve({ error: null }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/revoke-org-member')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/revoke-org-member')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'target-1', organizationId: 'org-1', callerUserId: 'admin-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when email and userId both missing', async () => {
    const handler = (await import('@/pages/api/revoke-org-member')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'admin-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing email or userId' });
  });

  it('returns 400 when organizationId or callerUserId missing', async () => {
    const handler = (await import('@/pages/api/revoke-org-member')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'target-1', callerUserId: 'admin-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing organizationId or callerUserId',
    });
  });

  it('returns 400 when revoking own access (userId === callerUserId)', async () => {
    const handler = (await import('@/pages/api/revoke-org-member')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'admin-1', organizationId: 'org-1', callerUserId: 'admin-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'You cannot revoke your own access' });
  });

  it('returns 403 when caller is not admin', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { role: 'member' }, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/revoke-org-member')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'target-1', organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Only organization admins can revoke access',
    });
  });

  it('returns 500 when delete org_members fails', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { role: 'admin' }, error: null }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: { message: 'db error' } }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) };
      }
      if (t === 'organizations') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) };
      }
      if (t === 'org_invites') {
        return { delete: () => ({ eq: () => ({ ilike: () => Promise.resolve({ error: null }) }) }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/revoke-org-member')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'target-1', organizationId: 'org-1', callerUserId: 'admin-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to remove member from organization',
    });
  });

  it('returns 500 when deleteUser fails', async () => {
    mockDeleteUser.mockResolvedValueOnce({ error: { message: 'auth error' } });
    const handler = (await import('@/pages/api/revoke-org-member')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'target-1', organizationId: 'org-1', callerUserId: 'admin-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('login could not be revoked'),
      })
    );
  });

  it('returns 200 success when revoking by userId', async () => {
    const handler = (await import('@/pages/api/revoke-org-member')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'target-1', organizationId: 'org-1', callerUserId: 'admin-1' },
        headers: { host: 'localhost:3000' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, userId: 'target-1' });
  });

  it('returns 200 success when revoking by email (resolves userId via listUsers)', async () => {
    const handler = (await import('@/pages/api/revoke-org-member')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: {
          email: 'member@test.com',
          organizationId: 'org-1',
          callerUserId: 'admin-1',
        },
        headers: { host: 'localhost:3000' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, userId: 'target-1' });
    expect(mockListUsers).toHaveBeenCalled();
  });
});
