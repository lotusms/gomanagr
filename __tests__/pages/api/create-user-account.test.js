/**
 * Unit tests for create-user-account API.
 * - POST only; 405 else
 * - 503 when Supabase unavailable
 * - 400 missing userId or userData; email required
 * - 200 returns account data when upsert succeeds
 * - 500 when upsert fails
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

describe('create-user-account API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'user_account') {
        return {
          upsert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'u1',
                    user_id: 'u1',
                    email: 'user@example.com',
                    first_name: 'Jane',
                    last_name: 'Doe',
                    company_name: 'Acme',
                    team_members: [],
                    profile: { reportingEmail: 'user@example.com' },
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/create-user-account')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/create-user-account')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', userData: { email: 'u@example.com' } },
    }, res);
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

  it('returns 400 when userId or userData missing', async () => {
    const handler = (await import('@/pages/api/create-user-account')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or userData' });

    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await handler({ method: 'POST', body: { userData: { email: 'u@example.com' } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when email is missing in userData', async () => {
    const handler = (await import('@/pages/api/create-user-account')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', userData: { firstName: 'Jane' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email is required' });
  });

  it('returns 200 with account data when upsert succeeds', async () => {
    const handler = (await import('@/pages/api/create-user-account')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        userData: {
          email: 'user@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          companyName: 'Acme',
        },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const json = res.json.mock.calls[0][0];
    expect(json.userId).toBe('u1');
    expect(json.email).toBe('user@example.com');
    expect(json.firstName).toBe('Jane');
    expect(json.lastName).toBe('Doe');
    expect(json.companyName).toBe('Acme');
  });

  it('returns 500 when upsert fails', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'user_account') {
        return {
          upsert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { message: 'upsert failed' },
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-user-account')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', userData: { email: 'user@example.com' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'server-error',
        message: expect.any(String),
      })
    );
  });
});
