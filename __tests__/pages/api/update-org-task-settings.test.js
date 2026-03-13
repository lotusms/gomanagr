/**
 * Unit tests for update-org-task-settings API.
 * POST only; 503; 400 missing userId; 403 not admin; 500 no config owner / load/update; 200.
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

describe('update-org-task-settings API', () => {
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
                    Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () =>
                  Promise.resolve({ data: [{ user_id: 'config-owner-1' }], error: null }),
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
                Promise.resolve({ data: { profile: {} }, error: null }),
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
    const handler = (await import('@/pages/api/update-org-task-settings')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/update-org-task-settings')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', taskSettings: { defaultView: 'list' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/update-org-task-settings')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { taskSettings: {} },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 403 when caller is not admin/owner/developer', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: { organization_id: 'org-1', role: 'member' }, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-task-settings')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', taskSettings: { defaultView: 'list' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Only an organization admin or owner can update task settings',
    });
  });

  it('returns 200 and saves taskSettings when success', async () => {
    const handler = (await import('@/pages/api/update-org-task-settings')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', taskSettings: { defaultView: 'list' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, taskSettings: expect.any(Object) })
    );
  });
});
