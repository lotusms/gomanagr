/**
 * Unit tests for delete-user-account API.
 * POST only; 503, 400 missing userId, 500 when auth delete fails, 200 success.
 */

const mockDeleteUser = jest.fn();
const mockFrom = jest.fn();
const mockCreateClient = jest.fn((url, key) => ({
  from: mockFrom,
  auth: { admin: { deleteUser: mockDeleteUser } },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return { status: jest.fn(function (c) { this.statusCode = c; return this; }), json: jest.fn(function (d) { this._json = d; return this; }) };
}

describe('delete-user-account API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((t) => {
      if (t === 'user_account') {
        return { delete: () => ({ eq: () => Promise.resolve({ error: null }) }) };
      }
      return {};
    });
    mockDeleteUser.mockResolvedValue({ error: null });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/delete-user-account')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/delete-user-account')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'service-unavailable', message: expect.any(String) })
    );
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/delete-user-account')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 500 when auth deleteUser fails', async () => {
    mockDeleteUser.mockResolvedValue({ error: { message: 'User not found' } });
    const handler = (await import('@/pages/api/delete-user-account')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'server-error', message: expect.any(String) })
    );
  });

  it('returns 200 when account and auth user deleted', async () => {
    const handler = (await import('@/pages/api/delete-user-account')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Account deleted successfully' });
    expect(mockFrom).toHaveBeenCalledWith('user_account');
    expect(mockDeleteUser).toHaveBeenCalledWith('u1');
  });
});
