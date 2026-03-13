/**
 * Unit tests for get-org-services API.
 * POST only; 503, 400 (missing organizationId or callerUserId), 403 (not member),
 * 200 with ownerUserId null when no owner, 200 with empty when profile error, 200 with services and teamMembers.
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

function buildOrgMembersForServices() {
  const idx = orgMembersCallIndex++;
  if (idx === 0) {
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

describe('get-org-services API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orgMembersCallIndex = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return buildOrgMembersForServices();
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    services: [{ id: 'svc1', name: 'Service A' }],
                    team_members: [{ id: 'tm1', name: 'Jane' }],
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
    const handler = (await import('@/pages/api/get-org-services')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-org-services')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when organizationId or callerUserId missing', async () => {
    const handler = (await import('@/pages/api/get-org-services')).default;
    const res1 = mockRes();
    await handler({ method: 'POST', body: { callerUserId: 'u1' } }, res1);
    expect(res1.status).toHaveBeenCalledWith(400);
    expect(res1.json).toHaveBeenCalledWith({
      error: 'Missing organizationId or callerUserId',
    });
    const res2 = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when caller is not a member', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
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
    const handler = (await import('@/pages/api/get-org-services')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not a member of this organization',
    });
  });

  it('returns 200 with ownerUserId null when no owner', async () => {
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
                    Promise.resolve({ data: { role: 'member' }, error: null }),
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
                    Promise.resolve({ data: null, error: null }),
                  then: (resolve) => resolve({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-services')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ownerUserId: null,
      services: [],
      teamMembers: [],
    });
  });

  it('returns 200 with empty when profile missing', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return buildOrgMembersForServices();
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: null, error: { message: 'not found' } }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-services')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ownerUserId: 'owner-1',
      services: [],
      teamMembers: [],
    });
  });

  it('returns 200 with services and teamMembers from owner profile', async () => {
    const handler = (await import('@/pages/api/get-org-services')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ownerUserId: 'owner-1',
      services: [{ id: 'svc1', name: 'Service A' }],
      teamMembers: [{ id: 'tm1', name: 'Jane' }],
    });
  });
});
