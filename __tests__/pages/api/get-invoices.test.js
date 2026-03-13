/**
 * Unit tests for get-invoices API.
 * POST only; 503, 400 (missing userId), 403 not org member, 500 on query error,
 * 200 with invoices list (optional statuses filter), 200 with single invoice (line_items normalized), 404, 500 single.
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

function makeListChain(result) {
  const chain = {
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    then: (resolve) => resolve(result),
  };
  return chain;
}

function makeSingleChain(maybeSingleResult) {
  const chain = {
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve(maybeSingleResult),
  };
  return chain;
}

describe('get-invoices API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((t) => {
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
      if (t === 'client_invoices') {
        const listResult = {
          data: [{ id: 'inv1', client_id: 'client-1', user_id: 'u1', organization_id: null }],
          error: null,
        };
        const chain = makeListChain(listResult);
        return { select: () => chain };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-invoices')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-invoices')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/get-invoices')).default;
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
    const handler = (await import('@/pages/api/get-invoices')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 500 when list query errors', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        const chain = makeListChain({ data: null, error: { message: 'db error' } });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-invoices')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load invoices' });
  });

  it('returns 200 with invoices list when no invoiceId', async () => {
    const handler = (await import('@/pages/api/get-invoices')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ invoices: expect.any(Array) })
    );
    expect(res.json.mock.calls[0][0].invoices).toHaveLength(1);
    expect(res.json.mock.calls[0][0].invoices[0].user_id).toBe('u1');
  });

  it('returns 200 with single invoice and normalizes line_items', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        const chain = makeSingleChain({
          data: {
            id: 'inv-1',
            client_id: 'client-1',
            user_id: 'u1',
            line_items: null,
          },
          error: null,
        });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-invoices')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice: expect.objectContaining({
          id: 'inv-1',
          line_items: [],
        }),
      })
    );
  });

  it('returns 404 when invoiceId provided but no invoice found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        const chain = makeSingleChain({ data: null, error: null });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-invoices')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'nonexistent' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
  });

  it('returns 500 when single invoice query errors', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        const chain = makeSingleChain({ data: null, error: { message: 'db error' } });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-invoices')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load invoice' });
  });

  it('returns 200 with invoices when organizationId and member', async () => {
    mockFrom.mockImplementation((t) => {
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
      if (t === 'client_invoices') {
        const chain = makeListChain({
          data: [{ id: 'inv1', organization_id: 'org-1' }],
          error: null,
        });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-invoices')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].invoices).toHaveLength(1);
    expect(res.json.mock.calls[0][0].invoices[0].organization_id).toBe('org-1');
  });

  it('applies statuses filter when statuses array provided', async () => {
    const handler = (await import('@/pages/api/get-invoices')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', statuses: ['paid', 'sent'] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockFrom).toHaveBeenCalledWith('client_invoices');
  });
});
