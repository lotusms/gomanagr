/**
 * Unit tests for am-i-platform-admin API.
 * GET only; 405; 401; 503; 500 check failed; 403 platformAdmin: false; 200 platformAdmin: true.
 */

const mockGetAuthenticatedUserId = jest.fn();
jest.mock('@/lib/apiAuth', () => ({
  getAuthenticatedUserId: (req) => mockGetAuthenticatedUserId(req),
}));

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args) => mockFrom(...args),
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

describe('am-i-platform-admin API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('u1');
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { user_id: 'u1' }, error: null }),
        }),
      }),
    });
  });

  it('returns 405 for non-GET', async () => {
    const handler = (await import('@/pages/api/platform/am-i-platform-admin')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 401 when no Bearer token', async () => {
    mockGetAuthenticatedUserId.mockResolvedValueOnce(null);
    const handler = (await import('@/pages/api/platform/am-i-platform-admin')).default;
    const res = mockRes();
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Authorization: Bearer <token> required',
    });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/platform/am-i-platform-admin')).default;
    const res = mockRes();
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 500 when platform_admins query errors', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: null, error: { message: 'db error' } }),
        }),
      }),
    });
    const handler = (await import('@/pages/api/platform/am-i-platform-admin')).default;
    const res = mockRes();
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Check failed' });
  });

  it('returns 403 platformAdmin: false when user not in platform_admins', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });
    const handler = (await import('@/pages/api/platform/am-i-platform-admin')).default;
    const res = mockRes();
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ platformAdmin: false });
  });

  it('returns 200 platformAdmin: true when user is in platform_admins', async () => {
    const handler = (await import('@/pages/api/platform/am-i-platform-admin')).default;
    const res = mockRes();
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ platformAdmin: true });
  });
});
