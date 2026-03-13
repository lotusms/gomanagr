/**
 * Unit tests for undo-invoice-payment API:
 * - POST only; 405 for other methods
 * - 503 when Supabase unavailable
 * - 400 when invoiceId or userId missing
 * - 403 when organizationId provided and user not member
 * - 404 when invoice not found
 * - 400 when balanceDue negative or > total
 * - 200 and update when balanceDue provided (correct balance)
 * - 400 when full undo but invoice not paid/partially_paid
 * - 200 and full reset when full undo (outstanding_balance = total, status = sent, paid_date = null)
 * - 500 when update fails
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
    setHeader: jest.fn(),
  };
}

const invoiceRow = {
  id: 'inv-1',
  total: '500',
  status: 'paid',
  outstanding_balance: '0',
};

function chainMaybeSingle(data, error = null) {
  const c = {
    eq: () => c,
    limit: () => c,
    is: () => c,
    maybeSingle: () => Promise.resolve({ data, error }),
  };
  return c;
}

describe('undo-invoice-payment API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'client_invoices') {
        return {
          select: () => chainMaybeSingle(invoiceRow),
          update: (payload) => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', userId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    jest.resetModules();
  });

  it('returns 400 when invoiceId or userId missing', async () => {
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing invoiceId or userId' });

    await handler({ method: 'POST', body: { invoiceId: 'inv-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when organizationId provided and user not member', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
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
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
  });

  it('returns 404 when invoice not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => chainMaybeSingle(null),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', userId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
  });

  it('returns 400 when balanceDue is negative', async () => {
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', userId: 'u1', balanceDue: -10 },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Balance due cannot be negative' });
  });

  it('returns 400 when balanceDue exceeds total', async () => {
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', userId: 'u1', balanceDue: 600 },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Balance due cannot exceed invoice total' });
  });

  it('returns 200 and updates invoice when balanceDue provided (correct balance)', async () => {
    let capturedUpdate = null;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => chainMaybeSingle(invoiceRow),
          update: (payload) => {
            capturedUpdate = payload;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', userId: 'u1', balanceDue: 200 },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate.outstanding_balance).toBe('200.00');
    expect(capturedUpdate.status).toBe('partially_paid');
    expect(capturedUpdate.paid_date).toBeDefined();
  });

  it('returns 200 and sets status paid when balanceDue is 0', async () => {
    let capturedUpdate = null;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => chainMaybeSingle(invoiceRow),
          update: (payload) => {
            capturedUpdate = payload;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', userId: 'u1', balanceDue: 0 },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(capturedUpdate.status).toBe('paid');
    expect(capturedUpdate.outstanding_balance).toBe('0.00');
  });

  it('returns 400 when full undo but invoice not paid or partially_paid', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => chainMaybeSingle({ ...invoiceRow, status: 'sent', outstanding_balance: '500' }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', userId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('not marked as paid or partially paid'),
    }));
  });

  it('returns 200 and full reset on full undo', async () => {
    let capturedUpdate = null;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => chainMaybeSingle(invoiceRow),
          update: (payload) => {
            capturedUpdate = payload;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', userId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate.outstanding_balance).toBe('500.00');
    expect(capturedUpdate.status).toBe('sent');
    expect(capturedUpdate.paid_date).toBeNull();
  });

  it('returns 500 when update fails', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => chainMaybeSingle(invoiceRow),
          update: () => ({ eq: () => Promise.resolve({ error: { message: 'db error' } }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/undo-invoice-payment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', userId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to reset invoice' });
  });
});
