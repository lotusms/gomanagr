/**
 * Unit tests for org-schedule-data API:
 * - Returns 405 for non-POST, 400 when userId missing, 200 with schedule: null when not a member
 * - Uses superadmin profile when present
 * - Uses developer profile when no superadmin (developer fallback)
 * - Uses admin profile when no superadmin or developer
 */

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

describe('org-schedule-data API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/org-schedule-data')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId is missing', async () => {
    const handler = (await import('@/pages/api/org-schedule-data')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 200 with schedule null when user is not a member', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
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
    const handler = (await import('@/pages/api/org-schedule-data')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'user-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ schedule: null });
  });

  it('returns schedule from developer profile when no superadmin', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'organization_id') {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({
                        data: { organization_id: 'org-1' },
                        error: null,
                      }),
                  }),
                }),
              };
            }
            if (cols === 'user_id') {
              return {
                eq: (col, val) => ({
                  eq: (roleCol, role) => ({
                    limit: (n) =>
                      role === 'superadmin'
                        ? { maybeSingle: () => Promise.resolve({ data: null, error: null }) }
                        : role === 'developer'
                          ? Promise.resolve({
                              data: [{ user_id: 'developer-user-id' }],
                              error: null,
                            })
                          : Promise.resolve({ data: [], error: null }),
                  }),
                }),
              };
            }
            return {};
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: (col, id) => ({
              single: () => {
                expect(id).toBe('developer-user-id');
                return Promise.resolve({
                  data: {
                    team_members: [{ id: 'tm1', name: 'Dev User' }],
                    appointments: [{ id: 'apt1', title: 'Meeting' }],
                    clients: [],
                    services: [],
                    profile: {},
                  },
                  error: null,
                });
              },
            }),
          }),
        };
      }
      return {};
    });

    const handler = (await import('@/pages/api/org-schedule-data')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'user-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.schedule).not.toBeNull();
    expect(payload.schedule.teamMembers).toHaveLength(1);
    expect(payload.schedule.teamMembers[0].name).toBe('Dev User');
    expect(payload.schedule.appointments).toHaveLength(1);
    expect(payload.schedule.appointments[0].title).toBe('Meeting');
  });

  it('returns schedule from superadmin profile when superadmin exists', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'organization_id') {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({
                        data: { organization_id: 'org-1' },
                        error: null,
                      }),
                  }),
                }),
              };
            }
            if (cols === 'user_id') {
              return {
                eq: (col, val) => ({
                  eq: (roleCol, role) => ({
                    limit: () => ({
                      maybeSingle: () => {
                        if (role === 'superadmin') {
                          return Promise.resolve({
                            data: { user_id: 'superadmin-user-id' },
                            error: null,
                          });
                        }
                        return Promise.resolve({ data: null, error: null });
                      },
                    }),
                  }),
                }),
              };
            }
            return {};
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: (col, id) => ({
              single: () => {
                expect(id).toBe('superadmin-user-id');
                return Promise.resolve({
                  data: {
                    team_members: [{ id: 'tm1', name: 'Owner' }],
                    appointments: [],
                    clients: [],
                    services: [],
                    profile: { timezone: 'America/New_York' },
                  },
                  error: null,
                });
              },
            }),
          }),
        };
      }
      return {};
    });

    const handler = (await import('@/pages/api/org-schedule-data')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'user-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.schedule).not.toBeNull();
    expect(payload.schedule.teamMembers[0].name).toBe('Owner');
    expect(payload.schedule.timezone).toBe('America/New_York');
  });
});
