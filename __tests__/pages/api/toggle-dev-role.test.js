/**
 * Unit tests for toggle-dev-role API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId or organizationId missing
 * - Returns 403 when userId is not the allowed toggle user
 * - Returns 404 when membership not found
 * - Returns 400 when role is not superadmin or developer
 * - Returns 200 with new role when allowed user toggles superadmin <-> developer
 */

const ALLOWED_USER_ID = 'd5107c55-56d1-480d-9274-30dd2d66665f';

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

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

describe('toggle-dev-role API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: (col, val) => ({
              eq: (col2, val2) => ({
                single: () =>
                  Promise.resolve({
                    data: { role: 'superadmin' },
                    error: null,
                  }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/toggle-dev-role')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or organizationId is missing', async () => {
    const handler = (await import('@/pages/api/toggle-dev-role')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: ALLOWED_USER_ID },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or organizationId' });

    await handler({
      method: 'POST',
      body: { organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when userId is not the allowed toggle user', async () => {
    const handler = (await import('@/pages/api/toggle-dev-role')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'other-user-id', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not allowed to toggle role' });
  });

  it('returns 404 when membership not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/toggle-dev-role')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: ALLOWED_USER_ID, organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Membership not found' });
  });

  it('returns 200 with role when allowed user toggles from superadmin to developer', async () => {
    const handler = (await import('@/pages/api/toggle-dev-role')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: ALLOWED_USER_ID, organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, role: 'developer' });
  });

  it('returns 200 with role superadmin when allowed user toggles from developer to superadmin', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { role: 'developer' },
                    error: null,
                  }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/toggle-dev-role')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: ALLOWED_USER_ID, organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, role: 'superadmin' });
  });

  it('returns 400 when member role is neither superadmin nor developer', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
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
      return {};
    });
    const handler = (await import('@/pages/api/toggle-dev-role')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: ALLOWED_USER_ID, organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Can only toggle between superadmin and developer',
    });
  });
});
