/**
 * Unit tests for update-client-online-resource API.
 * POST/PUT only; 503; 400 missing userId/resourceId; 404 resource not found;
 * 403 ownership/org; 500 update error; 200 ok.
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

const defaultResource = {
  id: 'res-1',
  user_id: 'u1',
  organization_id: null,
  resource_name: 'Site',
  url: 'https://example.com',
};

describe('update-client-online-resource API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((t) => {
      if (t === 'client_online_resources') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: defaultResource, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST/non-PUT', async () => {
    const handler = (await import('@/pages/api/update-client-online-resource')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('accepts PUT', async () => {
    const handler = (await import('@/pages/api/update-client-online-resource')).default;
    const res = mockRes();
    await handler({
      method: 'PUT',
      body: { userId: 'u1', resourceId: 'res-1', resource_name: 'Updated' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/update-client-online-resource')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', resourceId: 'res-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or resourceId missing', async () => {
    const handler = (await import('@/pages/api/update-client-online-resource')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { resourceId: 'res-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or resourceId' });
  });

  it('returns 404 when resource not found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_online_resources') {
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
    const handler = (await import('@/pages/api/update-client-online-resource')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', resourceId: 'bad-id' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Online resource not found' });
  });

  it('returns 403 when resource does not belong to user (no org)', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_online_resources') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...defaultResource, user_id: 'other' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-online-resource')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', resourceId: 'res-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Online resource does not belong to you' });
  });

  it('returns 403 when organizationId does not match resource org', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_online_resources') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...defaultResource, organization_id: 'org-other' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-online-resource')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', resourceId: 'res-1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Online resource does not belong to this organization' });
  });

  it('returns 500 when update fails', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_online_resources') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: defaultResource, error: null }),
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
    const handler = (await import('@/pages/api/update-client-online-resource')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', resourceId: 'res-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update online resource' });
  });

  it('returns 200 and updates when ownership valid', async () => {
    const handler = (await import('@/pages/api/update-client-online-resource')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', resourceId: 'res-1', resource_name: 'New Name' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(mockFrom).toHaveBeenCalledWith('client_online_resources');
  });
});
