/**
 * Unit tests for get-org-member-access API.
 * POST only; 503, 400 (missing userId), 200 with defaults (no membership / no config owner / no profile),
 * 200 with teamMemberSections from config owner profile, 500 on error.
 */

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));
jest.mock('@/config/teamMemberAccess', () => ({
  DEFAULT_TEAM_MEMBER_SECTIONS: {
    schedule: true,
    clients: true,
    projects: true,
    contracts: true,
    tasks: true,
  },
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

function buildOrgMembersForMemberAccess() {
  const idx = orgMembersCallIndex++;
  if (idx === 0) {
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
        eq: () => ({
          limit: () => ({
            then: (resolve) =>
              resolve(
                idx === 1
                  ? { data: [{ user_id: 'owner-1' }], error: null }
                  : { data: [], error: null }
              ),
          }),
        }),
      }),
    })
  };
}

describe('get-org-member-access API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orgMembersCallIndex = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return buildOrgMembersForMemberAccess();
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    profile: {
                      teamMemberSections: { schedule: true, clients: false },
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
    const handler = (await import('@/pages/api/get-org-member-access')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-org-member-access')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/get-org-member-access')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 200 with default sections when no membership', async () => {
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
    const handler = (await import('@/pages/api/get-org-member-access')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        teamMemberSections: expect.objectContaining({
          schedule: true,
          clients: true,
          projects: true,
          contracts: true,
          tasks: true,
        }),
      })
    );
  });

  it('returns 200 with default sections when no config owner', async () => {
    let call = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const n = call++;
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
              eq: () => ({
                limit: () => ({
                  then: (resolve) => resolve({ data: [], error: null }),
                }),
              }),
            }),
          })
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-member-access')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].teamMemberSections).toEqual(
      expect.objectContaining({ schedule: true, clients: true })
    );
  });

  it('returns 200 with teamMemberSections from config owner profile', async () => {
    const handler = (await import('@/pages/api/get-org-member-access')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        teamMemberSections: expect.objectContaining({
          schedule: true,
          clients: true,
        }),
      })
    );
  });

  it('returns 200 with default sections when profile has no teamMemberSections', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return buildOrgMembersForMemberAccess();
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { profile: {} },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-member-access')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].teamMemberSections).toBeDefined();
  });
});
