/**
 * Unit tests for stripe-balance API.
 * POST only; 503 Stripe not configured; 400 missing userId; 502 Stripe error; 500 other; 200 with balance.
 */

const mockBalanceRetrieve = jest.fn();
const mockPayoutsList = jest.fn();

const mockStripe = {
  balance: {
    retrieve: mockBalanceRetrieve,
  },
  payouts: {
    list: mockPayoutsList,
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
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

describe('stripe-balance API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBalanceRetrieve.mockResolvedValue({
      available: [{ currency: 'usd', amount: 10000 }],
      pending: [{ currency: 'usd', amount: 5000 }],
      instant_available: [],
      livemode: false,
    });
    mockPayoutsList.mockResolvedValue({
      data: [
        { arrival_date: Math.floor(Date.now() / 1000) + 86400 * 2 },
      ],
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/stripe-balance')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Stripe not configured', async () => {
    const orig = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/stripe-balance')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Stripe is not configured' });
    process.env.STRIPE_SECRET_KEY = orig;
    jest.resetModules();
  });

  it('returns 503 when secret key does not start with sk_', async () => {
    const orig = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = 'pk_test_xxx';
    jest.resetModules();
    const handler = (await import('@/pages/api/stripe-balance')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.STRIPE_SECRET_KEY = orig;
    jest.resetModules();
  });

  it('returns 400 when userId missing or invalid', async () => {
    const handler = (await import('@/pages/api/stripe-balance')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });

    const res2 = mockRes();
    await handler({ method: 'POST', body: { userId: 123 } }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);

    const res3 = mockRes();
    await handler({ method: 'POST', body: { userId: '   ' } }, res3);
    expect(res3.status).toHaveBeenCalledWith(400);
  });

  it('returns 502 when Stripe returns STRIPE_ERROR', async () => {
    mockBalanceRetrieve.mockRejectedValueOnce(
      Object.assign(new Error('Stripe error'), { code: 'STRIPE_ERROR' })
    );
    const handler = (await import('@/pages/api/stripe-balance')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Payment provider error',
        details: expect.any(String),
      })
    );
  });

  it('returns 200 with availableCents, pendingCents, currency, livemode', async () => {
    const handler = (await import('@/pages/api/stripe-balance')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        availableCents: 10000,
        pendingCents: 5000,
        currency: 'usd',
        livemode: false,
      })
    );
    expect(mockBalanceRetrieve).toHaveBeenCalled();
    expect(mockPayoutsList).toHaveBeenCalledWith({ status: 'pending', limit: 10 });
  });
});
