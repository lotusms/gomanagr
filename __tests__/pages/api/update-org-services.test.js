/**
 * Unit tests for update-org-services API.
 * POST only; 503; 400 missing params; 403; 404 owner not found; 500; 200.
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

describe('update-org-services API', () => {
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
              eq: () => ({
                limit: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { user_id: 'owner-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/update-org-services')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/update-org-services')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1', services: [] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when organizationId, callerUserId, or services missing', async () => {
    const handler = (await import('@/pages/api/update-org-services')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing organizationId, callerUserId, or services array',
    });
  });

  it('returns 403 when caller is not org admin', async () => {
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
    const handler = (await import('@/pages/api/update-org-services')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1', services: [] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Only org admins can update org services' });
  });

  it('returns 404 when org owner not found', async () => {
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
              eq: () => ({
                limit: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
      }
      return {};
    });
    orgMembersCallCount = 0;
    const handler = (await import('@/pages/api/update-org-services')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1', services: [] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Org owner not found' });
  });

  it('returns 200 when update succeeds', async () => {
    const handler = (await import('@/pages/api/update-org-services')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'u1', services: [{ id: 'svc-1', name: 'Service' }] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
