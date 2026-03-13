/**
 * Unit tests for get-org-team API.
 * POST only; 503, 400, 403 (not admin/developer), 200 with teamMembers [] when no owner, 200 with teamMembers from profile.
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

let orgMembersCallIndex = 0;

function buildOrgMembersForTeam() {
  const idx = orgMembersCallIndex++;
  if (idx === 0) {
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
        eq: () => ({
          limit: () => ({
            maybeSingle: () =>
              Promise.resolve(
                idx === 1
                  ? { data: { user_id: 'owner-1' }, error: null }
                  : { data: null, error: null }
              ),
            then: (resolve) =>
              resolve(
                idx === 2
                  ? { data: [{ user_id: 'owner-1' }], error: null }
                  : { data: [], error: null }
              ),
          }),
        }),
      }),
    }),
  };
}

describe('get-org-team API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orgMembersCallIndex = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return buildOrgMembersForTeam();
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { team_members: [{ id: 'tm1', name: 'Jane' }] },
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
    const handler = (await import('@/pages/api/get-org-team')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-org-team')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when organizationId or callerUserId missing', async () => {
    const handler = (await import('@/pages/api/get-org-team')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { callerUserId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing organizationId or callerUserId',
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
    const handler = (await import('@/pages/api/get-org-team')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Only org admins can load the org team',
    });
  });

  it('returns 200 with teamMembers [] when no owner', async () => {
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
              eq: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                  then: (resolve) => resolve({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-team')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      teamMembers: [],
      ownerUserId: null,
    });
  });

  it('returns 200 with teamMembers from owner profile', async () => {
    const handler = (await import('@/pages/api/get-org-team')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      teamMembers: [{ id: 'tm1', name: 'Jane' }],
      ownerUserId: 'owner-1',
    });
  });
});
