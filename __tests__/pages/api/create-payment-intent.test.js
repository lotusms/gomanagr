/**
 * Unit tests for create-payment-intent API:
 * - POST only; 405 for other methods
 * - 503 when Stripe or Supabase not configured
 * - 400 when invoiceId or token missing
 * - 404 invoice not found
 * - 403 invalid token
 * - 400 void invoice
 * - 400 already paid (balance <= 0)
 * - 400 payment amount invalid or too small (< 50 cents)
 * - 200 and clientSecret when creating new PaymentIntent
 * - 200 and reuse when existing PI is requires_payment_method and same amount
 */

const mockRetrieve = jest.fn();
const mockCreate = jest.fn();
const mockStripe = {
  paymentIntents: {
    retrieve: mockRetrieve,
    create: mockCreate,
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
  };
}

const invoiceRow = {
  id: 'inv-1',
  invoice_title: 'Test',
  invoice_number: 'INV-001',
  total: '100',
  outstanding_balance: '100',
  status: 'sent',
  payment_token: 'valid-token',
  stripe_payment_intent_id: null,
};

function setupSupabase(data = invoiceRow, updateResult = { error: null }) {
  mockFrom.mockImplementation((table) => {
    if (table === 'client_invoices') {
      return {
        select: () => ({
          eq: () => ({
            limit: () => ({
              single: () => Promise.resolve({ data, error: data ? null : { message: 'not found' } }),
            }),
          }),
        }),
        update: (payload) => ({
          eq: () => ({
            is: () => ({
              select: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'inv-1', stripe_payment_intent_id: payload?.stripe_payment_intent_id || 'pi_new' }, error: null }),
              }),
            }),
          }),
        }),
      };
    }
    return {};
  });
}

describe('create-payment-intent API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({
      id: 'pi_new',
      client_secret: 'pi_new_secret_xxx',
      status: 'requires_payment_method',
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Stripe not configured', async () => {
    const orig = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = '';
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Stripe is not configured' });
    process.env.STRIPE_SECRET_KEY = orig;
  });

  it('returns 400 when invoiceId or token missing', async () => {
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing invoiceId or token' });

    await handler({ method: 'POST', body: { invoiceId: 'inv-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await handler({ method: 'POST', body: { token: 't' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when invoice not found', async () => {
    setupSupabase(null);
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
  });

  it('returns 403 when token does not match', async () => {
    setupSupabase(invoiceRow);
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'wrong-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid link' });
  });

  it('returns 400 when invoice is void', async () => {
    setupSupabase({ ...invoiceRow, status: 'void' });
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'This invoice is void' });
  });

  it('returns 400 when invoice already paid', async () => {
    setupSupabase({ ...invoiceRow, outstanding_balance: '0' });
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'This invoice is already paid' });
  });

  it('returns 400 when amount too small', async () => {
    setupSupabase({ ...invoiceRow, total: '0.25', outstanding_balance: '0.25' });
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Amount due is too small to pay by card' });
  });

  it('returns 200 and clientSecret when creating new PaymentIntent', async () => {
    setupSupabase(invoiceRow);
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ clientSecret: 'pi_new_secret_xxx' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10000,
        currency: 'usd',
        metadata: { invoice_id: 'inv-1' },
      })
    );
  });

  it('returns 200 and reuses existing PI when requires_payment_method and same amount', async () => {
    setupSupabase({ ...invoiceRow, stripe_payment_intent_id: 'pi_existing' });
    mockRetrieve.mockResolvedValue({
      id: 'pi_existing',
      status: 'requires_payment_method',
      amount: 10000,
      client_secret: 'pi_existing_secret',
      payment_method_types: ['card'],
    });
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ clientSecret: 'pi_existing_secret' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when payment amount exceeds balance', async () => {
    setupSupabase(invoiceRow);
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token', amount: 200 },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payment amount cannot exceed the balance due' });
  });

  it('returns 400 when payment amount is zero', async () => {
    setupSupabase(invoiceRow);
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token', amount: 0 },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payment amount must be greater than zero' });
  });
});
