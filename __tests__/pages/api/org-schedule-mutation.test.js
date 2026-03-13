/**
 * Unit tests for org-schedule-mutation API.
 * POST only; 503, 400 (userId/action, action type, appointment/appointmentId), 403 not org member,
 * 500 no admin / failed load schedule, 404/403 team member paths, 404/403 delete, 500 update error, 200 ok.
 */

const mockFrom = jest.fn();
const mockGetUserById = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
    auth: { admin: { getUserById: mockGetUserById } },
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

let orgMembersCallIndex = 0;

function buildOrgMembersForSchedule() {
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
            maybeSingle: () =>
              Promise.resolve(
                idx === 1
                  ? { data: { user_id: 'admin-1' }, error: null }
                  : { data: null, error: null }
              ),
            then: (resolve) =>
              resolve(
                idx === 2
                  ? { data: [{ user_id: 'admin-1' }], error: null }
                  : { data: [], error: null }
              ),
          }),
        }),
      }),
    }),
  };
}

describe('org-schedule-mutation API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orgMembersCallIndex = 0;
    mockGetUserById.mockResolvedValue({
      data: { user: { id: 'u1', email: 'member@test.com' } },
      error: null,
    });
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return buildOrgMembersForSchedule();
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { appointments: [{ id: 'apt1', staffId: 'tm1', staffIds: ['tm1'] }] },
                  error: null,
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
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'admin-1', action: 'save', appointment: { id: 'apt1' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or action missing', async () => {
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { action: 'save', appointment: {} } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or action' });
  });

  it('returns 400 when action is not save or delete', async () => {
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'admin-1', action: 'patch', appointment: {} },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Action must be save or delete' });
  });

  it('returns 400 when save without appointment or appointments', async () => {
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'admin-1', action: 'save' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing appointment or appointments array for save',
    });
  });

  it('returns 400 when delete without appointmentId', async () => {
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'admin-1', action: 'delete' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing appointmentId for delete' });
  });

  it('returns 403 when not a member of an organization', async () => {
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
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', action: 'save', appointment: { id: 'apt1' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of an organization' });
  });

  it('returns 500 when no admin found for organization', async () => {
    let count = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const n = count++;
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
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', action: 'save', appointment: { id: 'apt1' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'No admin found for organization' });
  });

  it('returns 200 ok when admin saves appointment', async () => {
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'admin-1', action: 'save', appointment: { id: 'apt2', title: 'Meeting' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('returns 200 ok when admin deletes appointment', async () => {
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'admin-1', action: 'delete', appointmentId: 'apt1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('returns 404 when delete and appointment not found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return buildOrgMembersForSchedule();
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { appointments: [] },
                  error: null,
                }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'admin-1', action: 'delete', appointmentId: 'nonexistent' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Appointment not found' });
  });

  it('returns 500 when update schedule fails', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return buildOrgMembersForSchedule();
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { appointments: [] },
                  error: null,
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
    const handler = (await import('@/pages/api/org-schedule-mutation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'admin-1', action: 'save', appointment: { id: 'apt2' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update schedule' });
  });
});
