/**
 * Unit tests for sync-team-member-profile API.
 * POST only; 503, 400 (missing params), 403 not admin/developer, 200 synced: false (no members / no user),
 * 500 update error, 200 synced: true.
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

describe('sync-team-member-profile API', () => {
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
                eq: () => ({
                  single: () =>
                    Promise.resolve({ data: { role: 'admin' }, error: null }),
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
                  data: [{ user_id: 'u1' }, { user_id: 'u2' }],
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
              ilike: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'u1', profile: { role: 'Member' } },
                    error: null,
                  }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/sync-team-member-profile')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/sync-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        callerUserId: 'u1',
        email: 'member@test.com',
        teamMemberData: { firstName: 'Jane' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when organizationId, callerUserId, email, or teamMemberData missing', async () => {
    const handler = (await import('@/pages/api/sync-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing organizationId, callerUserId, email, or teamMemberData',
    });
  });

  it('returns 403 when caller is not admin or developer', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { role: 'member' }, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        callerUserId: 'u1',
        email: 'member@test.com',
        teamMemberData: { firstName: 'Jane' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Only admins and developers can sync team member profile',
    });
  });

  it('returns 200 synced: false when no members in org', async () => {
    let count = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const n = count++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({ data: { role: 'admin' }, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              then: (resolve) => resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        callerUserId: 'u1',
        email: 'member@test.com',
        teamMemberData: { firstName: 'Jane' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: false, reason: 'no_member_in_org' });
  });

  it('returns 200 synced: false when no user with email', async () => {
    let count = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const n = count++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({ data: { role: 'admin' }, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              then: (resolve) =>
                resolve({ data: [{ user_id: 'u1' }], error: null }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () => ({
              ilike: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        callerUserId: 'u1',
        email: 'unknown@test.com',
        teamMemberData: { firstName: 'Jane' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: false, reason: 'no_user_with_email' });
  });

  it('returns 500 when profile update fails', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const n = orgMembersCallCount++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({ data: { role: 'admin' }, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              then: (resolve) =>
                resolve({ data: [{ user_id: 'u1' }], error: null }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () => ({
              ilike: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'u1', profile: {} },
                    error: null,
                  }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: { message: 'db error' } }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        callerUserId: 'u1',
        email: 'member@test.com',
        teamMemberData: { firstName: 'Jane', lastName: 'Doe' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update profile' });
  });

  it('returns 200 synced: true when profile updated', async () => {
    const handler = (await import('@/pages/api/sync-team-member-profile')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        callerUserId: 'u1',
        email: 'member@test.com',
        teamMemberData: { firstName: 'Jane', lastName: 'Doe', title: 'Designer' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: true });
  });
});
