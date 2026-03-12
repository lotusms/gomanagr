/**
 * Unit tests for sync-invoice-paid API:
 * - GET: requires invoiceId and token; 403 invalid token; 404 not found; 200 alreadyPaid; 200 synced: false when no PI; 200 synced: true when PI succeeded
 * - POST: requires invoiceId and userId; 403 when not org member; 404 not found; 200 alreadyPaid; 200 synced: true and updates invoice
 */

const mockPaymentIntentsRetrieve = jest.fn();
const mockPaymentIntentsList = jest.fn();
const mockStripe = {
  paymentIntents: {
    retrieve: mockPaymentIntentsRetrieve,
    list: mockPaymentIntentsList,
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
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
  payment_token: 'valid-token',
  stripe_payment_intent_id: null,
  status: 'sent',
};

function setupSupabaseForGet(data = invoiceRow) {
  mockFrom.mockImplementation((table) => {
    if (table === 'client_invoices') {
      return {
        select: () => ({
          eq: (col, val) => ({
            limit: () => ({
              single: () => Promise.resolve({ data, error: null }),
            }),
          }),
        }),
      };
    }
    return {};
  });
}

function setupSupabaseForPost(data = invoiceRow, orgId = null) {
  let updatePayload = null;
  mockFrom.mockImplementation((table) => {
    if (table === 'client_invoices') {
      return {
        select: () => {
          const chain = {
            eq: (col, val) => chain,
            limit: (n) => chain,
            maybeSingle: () => Promise.resolve({ data, error: null }),
            is: (col, val) => chain,
          };
          if (orgId) {
            return { eq: (col, val) => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data, error: null }) }) }) };
          }
          return chain;
        },
        update: (payload) => {
          updatePayload = payload;
          return { eq: () => Promise.resolve({ error: null }) };
        },
      };
    }
    if (table === 'org_members' && orgId) {
      return {
        select: () => ({
          eq: (col, val) => ({ eq: (c2, v2) => ({ limit: () => ({ single: () => Promise.resolve({ data: { organization_id: orgId }, error: null }) }) }) }),
        }),
      };
    }
    if (table === 'user_profiles') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { email: 'owner@test.com' }, error: null }) }) }),
      };
    }
    return {};
  });
  return () => updatePayload;
}

describe('sync-invoice-paid API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPaymentIntentsRetrieve.mockResolvedValue({ status: 'succeeded', id: 'pi_123' });
    mockPaymentIntentsList.mockResolvedValue({ data: [{ id: 'pi_123', status: 'succeeded', metadata: { invoice_id: 'inv-1' } }] });
  });

  it('returns 503 when Stripe or Supabase is unavailable', async () => {
    const orig = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = '';
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 't' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Service unavailable' });
    process.env.STRIPE_SECRET_KEY = orig;
  });

  it('GET returns 400 when invoiceId or token missing', async () => {
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Missing invoiceId or token' });

    await handler({ method: 'GET', query: { invoiceId: 'inv-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('GET returns 404 when invoice not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Invoice not found' });
  });

  it('GET returns 403 when token does not match', async () => {
    setupSupabaseForGet(invoiceRow);
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'wrong-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Invalid link' });
  });

  it('GET returns 200 alreadyPaid when invoice status is paid', async () => {
    setupSupabaseForGet({ ...invoiceRow, status: 'paid' });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, alreadyPaid: true });
    expect(mockPaymentIntentsRetrieve).not.toHaveBeenCalled();
  });

  it('GET returns 200 synced: false when no succeeded PaymentIntent found', async () => {
    setupSupabaseForGet(invoiceRow);
    mockPaymentIntentsList.mockResolvedValueOnce({ data: [] });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: false });
  });

  it('GET returns 200 synced: true and updates invoice when PaymentIntent succeeded', async () => {
    let capturedUpdate = null;
    let selectCallCount = 0;
    const invoiceForEmail = { invoice_number: 'INV-001', invoice_title: 'Test', total: '100', user_id: 'u1', organization_id: null, client_snapshot: null };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: invoiceRow, error: null }),
                  }),
                }),
              };
            }
            return {
              eq: () => ({
                single: () => Promise.resolve({ data: invoiceForEmail, error: null }),
              }),
            };
          },
          update: (payload) => {
            capturedUpdate = payload;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: true });
    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate.status).toBe('paid');
    expect(capturedUpdate.outstanding_balance).toBe('0');
    expect(capturedUpdate.paid_date).toBeDefined();
  });

  it('POST returns 400 when invoiceId or userId missing', async () => {
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Missing invoiceId or userId' });
  });

  it('POST returns 404 when invoice not found', async () => {
    const chain = {
      eq: (col, val) => chain,
      limit: () => chain,
      is: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => chain,
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Invoice not found' });
  });

  it('POST returns 200 alreadyPaid when invoice already paid', async () => {
    setupSupabaseForPost({ ...invoiceRow, status: 'paid' });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, alreadyPaid: true });
  });

  it('POST returns 200 synced: true and updates invoice when PI succeeded', async () => {
    let capturedUpdate = null;
    let selectCallCount = 0;
    const invoiceForEmail = { invoice_number: 'INV-001', invoice_title: 'Test', total: '100', user_id: 'u1', organization_id: null, client_snapshot: null };
    const postSelectChain = {
      eq: (col, val) => postSelectChain,
      limit: () => postSelectChain,
      is: () => postSelectChain,
      maybeSingle: () => Promise.resolve({ data: invoiceRow, error: null }),
    };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => {
            selectCallCount += 1;
            if (selectCallCount === 1) return postSelectChain;
            return {
              eq: () => ({ single: () => Promise.resolve({ data: invoiceForEmail, error: null }) }),
            };
          },
          update: (payload) => {
            capturedUpdate = payload;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({
      data: [{ id: 'pi_123', status: 'succeeded', metadata: { invoice_id: 'inv-1' } }],
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: true });
    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate.status).toBe('paid');
    expect(capturedUpdate.outstanding_balance).toBe('0');
  });

  it('returns 405 for unsupported method', async () => {
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({ method: 'PATCH', query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });
});
