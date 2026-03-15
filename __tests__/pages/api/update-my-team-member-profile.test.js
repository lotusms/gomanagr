/**
 * Unit tests for update-my-team-member-profile API.
 * POST only; 503; 400 missing params; 404 user/profile; 403 not in org; 500; 200.
 */

const mockGetUserById = jest.fn();
const mockFrom = jest.fn();
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

describe('update-my-team-member-profile API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserById.mockResolvedValue({
      data: { user: { email: 'member@test.com' } },
      error: null,
    });
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'u1', profile: {} },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (t === 'org_members') {
        const chain = {
          eq: () => ({
            limit: () => ({
              single: () =>
                Promise.resolve({
                  data: { organization_id: 'org-1' },
                  error: null,
                }),
            }),
            in: () => ({
              limit: () =>
                Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
        return { select: () => chain };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', teamMemberData: { firstName: 'Jane' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or teamMemberData missing', async () => {
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or teamMemberData' });
  });

  it('returns 404 when user not found by auth', async () => {
    mockGetUserById.mockResolvedValueOnce({ data: { user: null }, error: { message: 'not found' } });
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', teamMemberData: { firstName: 'Jane' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('returns 400 when user has no email', async () => {
    mockGetUserById.mockResolvedValueOnce({ data: { user: { email: '   ' } }, error: null });
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', teamMemberData: { firstName: 'Jane' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'User has no email' });
  });

  it('returns 404 when user profile not found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
            }),
          }),
        };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
              }),
            }),
            in: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', teamMemberData: { firstName: 'Jane' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User profile not found' });
  });

  it('returns 403 when not a member of an organization', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'u1', profile: {} }, error: null }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
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
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', teamMemberData: { firstName: 'Jane' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of an organization' });
  });

  it('returns 200 and updates own profile when member not in admin team list', async () => {
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', teamMemberData: { firstName: 'Jane', lastName: 'Doe' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, member: expect.any(Object) })
    );
  });

  it('returns 403 when membership has no organization_id', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'u1', profile: {} }, error: null }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: {}, error: null }),
              }),
            }),
            in: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', teamMemberData: { firstName: 'Jane' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of an organization' });
  });

  it('updates admin team_members and syncs to profile when member is in admin list', async () => {
    const adminTeamMembers = [
      {
        id: 'u1',
        userId: 'u1',
        email: 'member@test.com',
        firstName: 'Old',
        lastName: 'Name',
        role: 'member',
      },
    ];
    let userProfilesCall = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        userProfilesCall++;
        return {
          select: () => ({
            eq: () => ({
              single: () => {
                if (userProfilesCall === 1) {
                  return Promise.resolve({ data: { id: 'u1', profile: {} }, error: null });
                }
                if (userProfilesCall === 2) {
                  return Promise.resolve({
                    data: { id: 'admin1', team_members: adminTeamMembers },
                    error: null,
                  });
                }
                return Promise.resolve({ data: { id: 'u1', profile: {} }, error: null });
              },
            }),
          }),
          update: (payload) => ({
            eq: (col, id) => {
              if (id === 'admin1' && payload.team_members) {
                expect(payload.team_members[0].firstName).toBe('Jane');
                expect(payload.team_members[0].lastName).toBe('Doe');
              }
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: (col) => ({
              limit: (n) => ({
                single: () =>
                  Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
              }),
              in: () => ({
                limit: () =>
                  Promise.resolve({ data: [{ user_id: 'admin1' }], error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        teamMemberData: { firstName: 'Jane', lastName: 'Doe', role: 'member' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, member: expect.objectContaining({ firstName: 'Jane', lastName: 'Doe' }) })
    );
  });

  it('returns 500 when own profile update fails (member not in list)', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'u1', profile: {} }, error: null }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: { message: 'Update failed' } }) }),
        };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
              }),
            }),
            in: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', teamMemberData: { firstName: 'Jane' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update profile' });
  });

  it('returns 500 when admin team_members update fails', async () => {
    const adminTeamMembers = [
      { id: 'u1', userId: 'u1', email: 'member@test.com', firstName: 'Old', lastName: 'Name' },
    ];
    let userProfilesCall = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        userProfilesCall++;
        return {
          select: () => ({
            eq: () => ({
              single: () => {
                if (userProfilesCall === 1) {
                  return Promise.resolve({ data: { id: 'u1', profile: {} }, error: null });
                }
                if (userProfilesCall === 2) {
                  return Promise.resolve({
                    data: { id: 'admin1', team_members: adminTeamMembers },
                    error: null,
                  });
                }
                return Promise.resolve({ data: { id: 'u1', profile: {} }, error: null });
              },
            }),
          }),
          update: (payload) => ({
            eq: (col, id) =>
              id === 'admin1' && payload.team_members
                ? Promise.resolve({ error: { message: 'RLS denied' } })
                : Promise.resolve({ error: null }),
          }),
        };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
              }),
              in: () => ({
                limit: () =>
                  Promise.resolve({ data: [{ user_id: 'admin1' }], error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', teamMemberData: { firstName: 'Jane' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update team member' });
  });

  it('returns 500 when handler throws', async () => {
    mockGetUserById.mockRejectedValueOnce(new Error('Auth error'));
    const handler = (await import('@/pages/api/update-my-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', teamMemberData: { firstName: 'Jane' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update profile' });
  });
});
