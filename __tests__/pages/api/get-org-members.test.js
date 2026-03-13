/**
 * Unit tests for get-org-members API.
 * POST only; 503, 400 (missing organizationId or callerUserId), 403 (not admin/developer),
 * 500 on members query error, 200 with members list.
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

let orgMembersCallCount = 0;

describe('get-org-members API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orgMembersCallCount = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const n = orgMembersCallCount++;
        if (n === 0) {
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
          })
        };
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                then: (resolve) =>
                  resolve({
                    data: [
                      {
                        user_id: 'u1',
                        role: 'admin',
                        user: { id: 'u1', email: 'admin@test.com' },
                      },
                    ],
                    error: null,
                  }),
            }),
          }),
        })
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-org-members')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-org-members')).default;
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

  it('returns 400 when organizationId or callerUserId missing', async () => {
    const handler = (await import('@/pages/api/get-org-members')).default;
    const res1 = mockRes();
    await handler({ method: 'POST', body: { callerUserId: 'u1' } }, res1);
    expect(res1.status).toHaveBeenCalledWith(400);
    expect(res1.json).toHaveBeenCalledWith({
      error: 'Missing organizationId or callerUserId',
    });
    const res2 = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
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
    const handler = (await import('@/pages/api/get-org-members')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Only org admins and developers can list members',
    });
  });

  it('returns 500 when members query errors', async () => {
    let count = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const n = count++;
        if (n === 0) {
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
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                then: (resolve) =>
                  resolve({ data: null, error: { message: 'db error' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-members')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load members' });
  });

  it('returns 200 with members list', async () => {
    const handler = (await import('@/pages/api/get-org-members')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ members: expect.any(Array) })
    );
    expect(res.json.mock.calls[0][0].members).toHaveLength(1);
    expect(res.json.mock.calls[0][0].members[0].user_id).toBe('u1');
    expect(res.json.mock.calls[0][0].members[0].user.email).toBe('admin@test.com');
  });
});
