/**
 * Unit tests for fix-missing-account API.
 * POST only; 400 userId/email required, 500 on update/insert error, 200 (already exists / updated / created).
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
  return { status: jest.fn(function (c) { this.statusCode = c; return this; }), json: jest.fn(function (d) { this._json = d; return this; }) };
}

describe('fix-missing-account API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'u1' }, error: null }) }) }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/fix-missing-account')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or email missing', async () => {
    const handler = (await import('@/pages/api/fix-missing-account')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'userId and email are required' });
  });

  it('returns 200 when profile already exists and has first/last name', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: 'u1', first_name: 'Jane', last_name: 'Doe' },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/fix-missing-account')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', email: 'jane@example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User account already exists', userId: 'u1', email: 'jane@example.com' })
    );
  });

  it('returns 200 when profile exists but missing names and update succeeds', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: 'u1', first_name: '', last_name: '' },
                  error: null,
                }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/fix-missing-account')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User account updated with firstName/lastName',
        userId: 'u1',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      })
    );
  });

  it('returns 500 when update fails', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: 'u1', first_name: '', last_name: '' }, error: null }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: { message: 'update failed' } }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/fix-missing-account')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', email: 'jane@example.com', firstName: 'Jane' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to update account', details: 'update failed' })
    );
  });

  it('returns 200 when no profile and insert succeeds', async () => {
    const handler = (await import('@/pages/api/fix-missing-account')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', email: 'new@example.com', firstName: 'New', lastName: 'User' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User account created successfully',
        userId: 'u1',
        email: 'new@example.com',
        accountId: 'u1',
      })
    );
  });

  it('returns 500 when insert fails', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'insert failed' } }) }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/fix-missing-account')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', email: 'new@example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to create user account', details: 'insert failed' })
    );
  });
});
