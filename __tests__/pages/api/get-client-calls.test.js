/**
 * Unit tests for get-client-calls API.
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

describe('get-client-calls API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              order: () =>
                Promise.resolve({
                  data: [{ id: 'call-1', summary: 'Summary', client_id: 'c1' }],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    });
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/get-client-calls')).default;
    const req = { method: 'GET', body: {} };
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or clientId is missing', async () => {
    const handler = (await import('@/pages/api/get-client-calls')).default;
    const res = mockRes();

    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or clientId' });

    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with calls array when query succeeds', async () => {
    const handler = (await import('@/pages/api/get-client-calls')).default;
    const req = { method: 'POST', body: { userId: 'u1', clientId: 'c1' } };
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      calls: [{ id: 'call-1', summary: 'Summary', client_id: 'c1' }],
    });
  });

  it('returns 503 when Supabase unavailable', async () => {
    const orig = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    jest.resetModules();
    const handler = (await import('@/pages/api/get-client-calls')).default;
    const res = mockRes();
    await handler(
      { method: 'POST', body: { userId: 'u1', clientId: 'c1' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = orig;
    jest.resetModules();
  });

  it('returns 403 when organizationId set but user not a member', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      };
    });
    const handler = (await import('@/pages/api/get-client-calls')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', organizationId: 'org1' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 200 with calls when organizationId set and user is member', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { organization_id: 'org1' },
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [{ id: 'call-2', summary: 'Org call', client_id: 'c1' }],
                  error: null,
                }),
            }),
          }),
        }),
      };
    });
    const handler = (await import('@/pages/api/get-client-calls')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', organizationId: 'org1' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      calls: [{ id: 'call-2', summary: 'Org call', client_id: 'c1' }],
    });
  });

  it('returns 200 with single call when callId is set', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ id: 'call-one', summary: 'One', client_id: 'c1' }],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    });
    const handler = (await import('@/pages/api/get-client-calls')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', callId: 'call-one' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      call: { id: 'call-one', summary: 'One', client_id: 'c1' },
    });
  });

  it('returns 404 when callId set but call not found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              eq: () =>
                Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    });
    const handler = (await import('@/pages/api/get-client-calls')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', callId: 'missing' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Call not found' });
  });

  it('returns 500 when data query errors', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              order: () =>
                Promise.resolve({
                  data: null,
                  error: { message: 'db error' },
                }),
            }),
          }),
        }),
      }),
    });
    const handler = (await import('@/pages/api/get-client-calls')).default;
    const res = mockRes();
    await handler(
      { method: 'POST', body: { userId: 'u1', clientId: 'c1' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load calls' });
  });

  it('returns 500 when handler throws', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.reject(new Error('connection lost')),
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      };
    });
    const handler = (await import('@/pages/api/get-client-calls')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', organizationId: 'org1' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load calls' });
  });
});
