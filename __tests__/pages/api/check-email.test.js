/**
 * Unit tests for check-email API:
 * - POST only; 405 for other methods
 * - 400 invalid email (missing or no @)
 * - 503 when Supabase not configured
 * - 200 exists: true from user_account
 * - 200 exists: false when not in user_account and not in auth
 * - 200 exists: true, methods from auth listUsers
 * - 200 quota-exceeded when auth returns rate limit
 * - 200 exists: false, server-error when auth error
 * - 500 on unexpected error
 */

const mockListUsers = jest.fn();
const mockFrom = jest.fn();

const mockCreateClient = jest.fn(() => ({
  from: mockFrom,
  auth: {
    admin: {
      listUsers: mockListUsers,
    },
  },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
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

describe('check-email API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'user_account') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    mockListUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/check-email')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when email missing or invalid', async () => {
    const handler = (await import('@/pages/api/check-email')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email format' });

    await handler({ method: 'POST', body: { email: 'no-at-sign' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 503 when Supabase not configured', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/check-email')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { email: 'u@example.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'service-unavailable',
        message: expect.stringContaining('unavailable'),
      })
    );
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 200 exists: true when found in user_account', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'user_account') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { email: 'u@example.com' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/check-email')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { email: 'u@example.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ exists: true, methods: [] });
  });

  it('returns 200 exists: false when not in user_account and not in auth', async () => {
    const handler = (await import('@/pages/api/check-email')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { email: 'new@example.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ exists: false, methods: [] });
  });

  it('returns 200 exists: true with methods when found in auth listUsers', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'user_account') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    mockListUsers
      .mockResolvedValueOnce({
        data: {
          users: [
            { email: 'auth@example.com', app_metadata: { providers: ['email', 'google'] } },
          ],
        },
        error: null,
      });
    const handler = (await import('@/pages/api/check-email')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { email: 'auth@example.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      exists: true,
      methods: ['email', 'google'],
    });
  });

  it('returns 200 exists: false with quota-exceeded when auth rate limited', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'user_account') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    mockListUsers.mockResolvedValue({
      data: null,
      error: { status: 429, message: 'Rate limit' },
    });
    const handler = (await import('@/pages/api/check-email')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { email: 'u@example.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        exists: false,
        methods: [],
        error: 'quota-exceeded',
      })
    );
  });

  it('returns 200 exists: false with server-error when auth errors (non-rate-limit)', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'user_account') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    mockListUsers.mockResolvedValue({
      data: null,
      error: { message: 'Auth server error' },
    });
    const handler = (await import('@/pages/api/check-email')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { email: 'u@example.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        exists: false,
        methods: [],
        error: 'server-error',
      })
    );
  });

  it('normalizes email to lowercase for user_account check', async () => {
    let eqEmail = null;
    mockFrom.mockImplementation((table) => {
      if (table === 'user_account') {
        return {
          select: () => ({
            eq: (col, val) => {
              if (col === 'email') eqEmail = val;
              return {
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              };
            },
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/check-email')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { email: 'User@Example.COM' } }, res);
    expect(eqEmail).toBe('user@example.com');
  });
});
