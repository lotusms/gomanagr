/**
 * Unit tests for get-next-service-id API.
 * POST only; 503, 400 (missing userId), 403 not org member,
 * 200 when no profile (first ID), 200 with profile services (next sequence), 200 for org with owner prefix.
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

function buildOrgMembersChain() {
  const idx = orgMembersCallIndex++;
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          limit: () => ({
            single: () =>
              Promise.resolve(
                idx === 0
                  ? { data: { organization_id: 'org-1' }, error: null }
                  : { data: null, error: null }
              ),
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

describe('get-next-service-id API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orgMembersCallIndex = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return buildOrgMembersChain();
      }
      if (t === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id_prefix: 'ORG', name: 'Test Org' },
                    error: null,
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
                  data: null,
                  error: { message: 'not found' },
                }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-next-service-id')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-next-service-id')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/get-next-service-id')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 403 when organizationId provided and user not a member', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-next-service-id')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 200 with first suggestedId when no profile', async () => {
    const handler = (await import('@/pages/api/get-next-service-id')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedId: expect.stringMatching(/^PER-SVC-\d{8}-001$/),
        orgPrefix: 'PER',
      })
    );
  });

  it('returns 200 with next sequence when profile has services', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    services: [
                      { service_number: 'PER-SVC-20250301-001' },
                      { service_number: 'PER-SVC-20250301-005' },
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
    const handler = (await import('@/pages/api/get-next-service-id')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', date: '2025-03-13' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedId: 'PER-SVC-20250313-006',
        orgPrefix: 'PER',
      })
    );
  });

  it('returns 200 for org with owner prefix when superadmin resolved', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return buildOrgMembersChain();
      }
      if (t === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id_prefix: 'ABC', name: 'Org' },
                    error: null,
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
                  data: { services: [] },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-next-service-id')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedId: expect.stringMatching(/^ABC-SVC-\d{8}-001$/),
        orgPrefix: 'ABC',
      })
    );
  });
});
