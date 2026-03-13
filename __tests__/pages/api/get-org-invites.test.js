/**
 * Unit tests for get-org-invites API.
 * POST only; 503, 400 (missing organizationId or callerUserId), 403 (not admin/developer),
 * 500 on invites query error, 200 with invites list.
 */

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
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

function makeChain(result) {
  return {
    eq: () => makeChain(result),
    gt: () => ({
      then: (resolve) => resolve(result),
    }),
  };
}

describe('get-org-invites API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        };
      }
      if (t === 'org_invites') {
        const chain = makeChain({
          data: [
            { id: 'inv1', email: 'a@test.com', created_at: '2025-01-01', expires_at: '2026-01-01' },
          ],
          error: null,
        });
        return { select: () => chain };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-org-invites')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when organizationId missing', async () => {
    const handler = (await import('@/pages/api/get-org-invites')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { callerUserId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing organizationId or callerUserId',
    });
  });

  it('returns 400 when callerUserId missing', async () => {
    const handler = (await import('@/pages/api/get-org-invites')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing organizationId or callerUserId',
    });
  });

  it('returns 403 when caller is not admin or developer', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
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
    const handler = (await import('@/pages/api/get-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Only org admins and developers can list invites',
    });
  });

  it('returns 403 when membership not found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Only org admins and developers can list invites',
    });
  });

  it('returns 500 when org_invites query errors', async () => {
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
        };
      }
      if (t === 'org_invites') {
        const chain = makeChain({ data: null, error: { message: 'db error' } });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load invites' });
  });

  it('returns 200 with invites list for admin caller', async () => {
    const handler = (await import('@/pages/api/get-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ invites: expect.any(Array) })
    );
    expect(res.json.mock.calls[0][0].invites).toHaveLength(1);
    expect(res.json.mock.calls[0][0].invites[0].email).toBe('a@test.com');
  });

  it('returns 200 with invites for developer caller', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { role: 'developer' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (t === 'org_invites') {
        const chain = makeChain({ data: [], error: null });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-invites')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].invites).toEqual([]);
  });
});
