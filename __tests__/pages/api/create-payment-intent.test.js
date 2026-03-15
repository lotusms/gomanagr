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

const mockGetStripeConfig = jest.fn();
jest.mock('@/lib/getStripeConfig', () => ({
  getStripeConfig: (...args) => mockGetStripeConfig(...args),
}));

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

function setupSupabase(data = invoiceRow, updateResult = null, getCurrentRow = null) {
  const updateSuccess = updateResult === null;
  mockFrom.mockImplementation((table) => {
    if (table === 'client_invoices') {
      return {
        select: (...cols) => {
          if (cols.length === 1 && cols[0] === 'stripe_payment_intent_id') {
            return {
              eq: () => ({
                single: () => Promise.resolve({ data: getCurrentRow, error: null }),
              }),
            };
          }
          return {
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data, error: data ? null : { message: 'not found' } }),
              }),
            }),
          };
        },
        update: (payload) => {
          const eqReturn = {
            is: () => ({
              select: () => ({
                maybeSingle: () =>
                  Promise.resolve(
                    updateSuccess
                      ? { data: { id: 'inv-1', stripe_payment_intent_id: payload?.stripe_payment_intent_id || 'pi_new' }, error: null }
                      : { data: null, error: updateResult?.error || { message: 'conflict' } }
                  ),
              }),
            }),
          };
          eqReturn.then = (resolve) => resolve({ error: null });
          return { eq: () => eqReturn };
        },
      };
    }
    return {};
  });
}

const validStripeConfig = {
  publishableKey: 'pk_test_xxx',
  secretKey: 'sk_test_xxx',
  webhookSecret: '',
  paymentMethodConfigId: '',
};

describe('create-payment-intent API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStripeConfig.mockResolvedValue(validStripeConfig);
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
    mockGetStripeConfig.mockResolvedValueOnce({ secretKey: '' });
    setupSupabase(invoiceRow);
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Stripe is not configured' });
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

  it('returns 503 when Supabase client cannot be created', async () => {
    mockCreateClient.mockImplementationOnce(() => {
      throw new Error('supabase init');
    });
    jest.resetModules();
    const mod = await import('@/pages/api/create-payment-intent');
    const res = mockRes();
    await mod.default({ method: 'POST', body: { invoiceId: 'inv-1', token: 'valid-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    mockCreateClient.mockImplementation(() => ({ from: mockFrom }));
    jest.resetModules();
    await import('@/pages/api/create-payment-intent');
  });

  it('returns 200 with partial payment amount', async () => {
    setupSupabase(invoiceRow);
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token', amount: 50 },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000, currency: 'usd', metadata: { invoice_id: 'inv-1' } })
    );
  });

  it('returns 200 and reuses existing PI when cardOnlyConfigId and same config', async () => {
    mockGetStripeConfig.mockResolvedValueOnce({
      ...validStripeConfig,
      paymentMethodConfigId: 'pmc_xxx',
    });
    setupSupabase({ ...invoiceRow, stripe_payment_intent_id: 'pi_existing' });
    mockRetrieve.mockResolvedValue({
      id: 'pi_existing',
      status: 'requires_payment_method',
      amount: 10000,
      client_secret: 'pi_existing_secret',
      payment_method_configuration: 'pmc_xxx',
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

  it('creates PI with payment_method_configuration when cardOnlyConfigId set', async () => {
    mockGetStripeConfig.mockResolvedValueOnce({
      ...validStripeConfig,
      paymentMethodConfigId: 'pmc_yyy',
    });
    setupSupabase(invoiceRow);
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10000,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        payment_method_configuration: 'pmc_yyy',
      })
    );
  });

  it('returns 200 with current PI when update fails but row has reusable PI', async () => {
    setupSupabase(invoiceRow, { error: { message: 'conflict' } }, { stripe_payment_intent_id: 'pi_current' });
    mockRetrieve.mockResolvedValueOnce({
      id: 'pi_current',
      status: 'requires_payment_method',
      amount: 10000,
      client_secret: 'pi_current_secret',
      payment_method_types: ['card'],
    });
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ clientSecret: 'pi_current_secret' });
  });

  it('returns 200 with new PI when update fails and row has no current PI', async () => {
    setupSupabase(invoiceRow, { error: { message: 'conflict' } }, null);
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ clientSecret: 'pi_new_secret_xxx' });
  });

  it('returns 200 with new PI when update fails and current PI not reusable then overwrites', async () => {
    setupSupabase(invoiceRow, { error: { message: 'conflict' } }, { stripe_payment_intent_id: 'pi_old' });
    mockRetrieve.mockResolvedValue({
      id: 'pi_old',
      status: 'succeeded',
      amount: 10000,
      client_secret: 'pi_old_secret',
    });
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ clientSecret: 'pi_new_secret_xxx' });
  });

  it('returns 502 when Stripe returns STRIPE_ERROR', async () => {
    setupSupabase(invoiceRow);
    const stripeError = new Error('Stripe API error');
    stripeError.code = 'STRIPE_ERROR';
    mockCreate.mockRejectedValueOnce(stripeError);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payment provider error', details: 'Stripe API error' });
    spy.mockRestore();
  });

  it('uses outstanding_balance when set and differs from total', async () => {
    setupSupabase({ ...invoiceRow, total: '100', outstanding_balance: '60' });
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 6000 })
    );
  });

  it('returns 500 when an unexpected error is thrown', async () => {
    setupSupabase(invoiceRow);
    mockGetStripeConfig.mockRejectedValueOnce(new Error('Network failure'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const handler = (await import('@/pages/api/create-payment-intent')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
    spy.mockRestore();
  });
});
