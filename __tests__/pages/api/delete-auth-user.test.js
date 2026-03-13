/**
 * Unit tests for delete-auth-user API.
 * - POST only; 405 else
 * - 503 when Supabase unavailable
 * - 400 missing userId
 * - 500 when auth.admin.deleteUser fails
 * - 200 success when delete succeeds
 */

const mockDeleteUser = jest.fn();
const mockFrom = jest.fn();
const mockCreateClient = jest.fn((url, key) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key === serviceKey) {
    return {
      from: mockFrom,
      auth: { admin: { deleteUser: mockDeleteUser } },
    };
  }
  return { from: mockFrom, auth: { admin: { deleteUser: mockDeleteUser } } };
});

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

describe('delete-auth-user API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteUser.mockResolvedValue({ error: null });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/delete-auth-user')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/delete-auth-user')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/delete-auth-user')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 500 when deleteUser fails', async () => {
    mockDeleteUser.mockResolvedValue({ error: { message: 'User not found' } });
    const handler = (await import('@/pages/api/delete-auth-user')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to delete user',
      message: 'User not found',
    });
  });

  it('returns 200 when delete succeeds', async () => {
    const handler = (await import('@/pages/api/delete-auth-user')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(mockDeleteUser).toHaveBeenCalledWith('u1');
  });
});
