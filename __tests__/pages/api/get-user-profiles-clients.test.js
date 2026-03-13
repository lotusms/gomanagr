/**
 * Unit tests for get-user-profiles-clients API.
 * POST only; 503, 400 (missing userId), 500, 200 with profiles (single user or org members).
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

describe('get-user-profiles-clients API', () => {
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
                limit: () => ({
                  single: () =>
                    Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              then: (resolve) =>
                resolve({
                  data: [
                    { user_id: 'u1' },
                    { user_id: 'u2' },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () => ({
              then: (resolve) =>
                resolve({
                  data: [
                    { id: 'u1', email: 'a@test.com', clients: [] },
                    { id: 'u2', email: 'b@test.com', clients: [{ id: 'c1' }] },
                  ],
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
    const handler = (await import('@/pages/api/get-user-profiles-clients')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-user-profiles-clients')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/get-user-profiles-clients')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 500 when user_profiles query errors', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () => ({
              then: (resolve) =>
                resolve({ data: null, error: { message: 'db error' } }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-user-profiles-clients')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load profiles' });
  });

  it('returns 200 with profiles for user in org (org members profiles)', async () => {
    const handler = (await import('@/pages/api/get-user-profiles-clients')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ profiles: expect.any(Array) })
    );
    expect(res.json.mock.calls[0][0].profiles).toHaveLength(2);
    expect(res.json.mock.calls[0][0].profiles[0].id).toBe('u1');
    expect(res.json.mock.calls[0][0].profiles[1].clients).toHaveLength(1);
  });

  it('returns 200 with single profile when user not in org', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () => ({
              then: (resolve) =>
                resolve({
                  data: [{ id: 'u1', email: 'only@test.com', clients: [] }],
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-user-profiles-clients')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].profiles).toHaveLength(1);
    expect(res.json.mock.calls[0][0].profiles[0].email).toBe('only@test.com');
  });
});
