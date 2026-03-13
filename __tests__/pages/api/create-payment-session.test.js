/**
 * Unit tests for create-payment-session API (Stripe Checkout Session for invoice).
 * - POST only; 405 else
 * - 503 Stripe or Supabase not configured
 * - 400 missing invoiceId/token, void invoice, already paid, amount too small
 * - 404 invoice not found; 403 invalid token
 * - 200 returns url when success
 */

const mockCheckoutSessionsCreate = jest.fn();
const mockStripe = {
  checkout: {
    sessions: { create: mockCheckoutSessionsCreate },
  },
};

jest.mock('stripe', () => jest.fn().mockImplementation(() => mockStripe));

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
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
  };
}

const invoiceRow = {
  id: 'inv-1',
  invoice_title: 'Test Invoice',
  invoice_number: 'INV-001',
  total: '100',
  outstanding_balance: '100',
  status: 'sent',
  payment_token: 'valid-token',
};

describe('create-payment-session API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: invoiceRow, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    mockCheckoutSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session-xxx' });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/create-payment-session')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 503 when Stripe not configured', async () => {
    const orig = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = '';
    const handler = (await import('@/pages/api/create-payment-session')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { invoiceId: 'inv-1', token: 't' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Stripe is not configured' });
    process.env.STRIPE_SECRET_KEY = orig;
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/create-payment-session')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { invoiceId: 'inv-1', token: 't' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when invoiceId or token missing', async () => {
    const handler = (await import('@/pages/api/create-payment-session')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing invoiceId or token' });
  });

  it('returns 404 when invoice not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-payment-session')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { invoiceId: 'inv-1', token: 'valid-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
  });

  it('returns 403 when token does not match', async () => {
    const handler = (await import('@/pages/api/create-payment-session')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { invoiceId: 'inv-1', token: 'wrong-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid link' });
  });

  it('returns 400 when invoice is void', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: { ...invoiceRow, status: 'void' }, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-payment-session')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { invoiceId: 'inv-1', token: 'valid-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'This invoice is void' });
  });

  it('returns 400 when invoice already paid', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...invoiceRow, outstanding_balance: '0' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-payment-session')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { invoiceId: 'inv-1', token: 'valid-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'This invoice is already paid' });
  });

  it('returns 400 when amount too small', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...invoiceRow, total: '0.25', outstanding_balance: '0.25' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-payment-session')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { invoiceId: 'inv-1', token: 'valid-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Amount due is too small to pay by card' });
  });

  it('returns 200 with url when success', async () => {
    const handler = (await import('@/pages/api/create-payment-session')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { invoiceId: 'inv-1', token: 'valid-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ url: 'https://checkout.stripe.com/session-xxx' });
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        success_url: expect.stringContaining('/pay/'),
        cancel_url: expect.stringContaining('/pay/'),
        metadata: { invoice_id: 'inv-1' },
      })
    );
  });
});
