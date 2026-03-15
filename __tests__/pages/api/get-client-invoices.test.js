/**
 * Unit tests for get-client-invoices API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId or clientId missing
 * - Returns 200 with invoices array when successful
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

describe('get-client-invoices API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              order: () => ({
                order: () =>
                  Promise.resolve({
                    data: [{ id: 'i1', invoice_number: 'INV-001', client_id: 'c1' }],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      }),
    });
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/get-client-invoices')).default;
    const req = { method: 'GET', body: {} };
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or clientId is missing', async () => {
    const handler = (await import('@/pages/api/get-client-invoices')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or clientId' });
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with invoices array when query succeeds', async () => {
    const handler = (await import('@/pages/api/get-client-invoices')).default;
    const req = { method: 'POST', body: { userId: 'u1', clientId: 'c1' } };
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      invoices: [{ id: 'i1', invoice_number: 'INV-001', client_id: 'c1' }],
    });
  });

  it('returns 503 when Supabase unavailable', async () => {
    const orig = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    jest.resetModules();
    const handler = (await import('@/pages/api/get-client-invoices')).default;
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
                order: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }),
      };
    });
    const handler = (await import('@/pages/api/get-client-invoices')).default;
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

  it('returns 200 with invoices when organizationId set and user is member', async () => {
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
              order: () => ({
                order: () =>
                  Promise.resolve({
                    data: [{ id: 'i2', invoice_number: 'INV-002', client_id: 'c1' }],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      };
    });
    const handler = (await import('@/pages/api/get-client-invoices')).default;
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
      invoices: [{ id: 'i2', invoice_number: 'INV-002', client_id: 'c1' }],
    });
  });

  it('returns 200 with single invoice when invoiceId is set', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ id: 'i-one', invoice_number: 'INV-1', client_id: 'c1', line_items: [] }],
                  error: null,
                }),
            }),
          }),
        }),
      }),
    });
    const handler = (await import('@/pages/api/get-client-invoices')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', invoiceId: 'i-one' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      invoice: { id: 'i-one', invoice_number: 'INV-1', client_id: 'c1', line_items: [] },
    });
  });

  it('returns 404 when invoiceId set but invoice not found', async () => {
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
    const handler = (await import('@/pages/api/get-client-invoices')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', invoiceId: 'missing' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
  });

  it('returns 500 when data query errors', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              order: () => ({
                order: () =>
                  Promise.resolve({
                    data: null,
                    error: { message: 'db error' },
                  }),
              }),
            }),
          }),
        }),
      }),
    });
    const handler = (await import('@/pages/api/get-client-invoices')).default;
    const res = mockRes();
    await handler(
      { method: 'POST', body: { userId: 'u1', clientId: 'c1' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load invoices' });
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
                order: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }),
      };
    });
    const handler = (await import('@/pages/api/get-client-invoices')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', organizationId: 'org1' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load invoices' });
  });
});
