/**
 * Unit tests for my-team-member-profile API.
 * POST only; 503, 400 (missing userId), 404 user not found, 200 member null (no org / no email),
 * 200 with member from admin team_members, 200 with member built from own profile, 500 on error.
 */

const mockFrom = jest.fn();
const mockGetUserById = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        getUserById: mockGetUserById,
      },
    },
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

let orgMembersCallCount = 0;

describe('my-team-member-profile API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orgMembersCallCount = 0;
    mockGetUserById.mockResolvedValue({
      data: { user: { id: 'u1', email: 'member@test.com' } },
      error: null,
    });
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const n = orgMembersCallCount++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { organization_id: 'org-1' },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  then: (resolve) =>
                    resolve({
                      data: [{ user_id: 'admin-1' }],
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'u1',
                    first_name: 'Jane',
                    last_name: 'Doe',
                    email: 'member@test.com',
                    profile: {
                      role: 'Member',
                      title: 'Designer',
                      phone: '555-1234',
                      address: { city: 'NYC', country: 'US' },
                    },
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
    const handler = (await import('@/pages/api/my-team-member-profile')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/my-team-member-profile')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/my-team-member-profile')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 404 when user not found by auth', async () => {
    mockGetUserById.mockResolvedValue({
      data: { user: null },
      error: { message: 'not found' },
    });
    const handler = (await import('@/pages/api/my-team-member-profile')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('returns 404 when user has no email (auth user not found)', async () => {
    mockGetUserById.mockResolvedValue({
      data: { user: { id: 'u1', email: '' } },
      error: null,
    });
    const handler = (await import('@/pages/api/my-team-member-profile')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('returns 200 member null when not in org', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/my-team-member-profile')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ member: null });
  });

  it('returns 200 with member built from own profile when not in admin team_members', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const n = orgMembersCallCount++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { organization_id: 'org-1' },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  then: (resolve) => resolve({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'u1',
                    first_name: 'Jane',
                    last_name: 'Doe',
                    email: 'member@test.com',
                    profile: { role: 'Member', title: 'Designer' },
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/my-team-member-profile')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        member: expect.objectContaining({
          id: 'u1',
          userId: 'u1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'member@test.com',
          role: 'Member',
          title: 'Designer',
        }),
        adminUserId: null,
      })
    );
  });

  it('returns 200 with member from admin team_members when match found', async () => {
    let profileCallCount = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const n = orgMembersCallCount++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { organization_id: 'org-1' },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  then: (resolve) =>
                    resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        const p = profileCallCount++;
        if (p === 0) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'u1',
                      first_name: 'Jane',
                      last_name: 'Doe',
                      email: 'member@test.com',
                      profile: {},
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    team_members: [
                      {
                        id: 'tm1',
                        email: 'member@test.com',
                        firstName: 'Jane',
                        lastName: 'Doe',
                        userId: 'u1',
                      },
                    ],
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/my-team-member-profile')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        member: expect.objectContaining({
          id: 'tm1',
          email: 'member@test.com',
          firstName: 'Jane',
          lastName: 'Doe',
          userId: 'u1',
        }),
        adminUserId: 'admin-1',
      })
    );
  });
});
