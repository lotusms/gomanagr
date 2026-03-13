/**
 * Unit tests for stripe-payout API.
 * POST only; 503 Stripe not configured; 400 missing userId / no balance / instant not enabled; 502 Stripe error; 200 with payout.
 */

const mockBalanceRetrieve = jest.fn();
const mockPayoutsCreate = jest.fn();

const mockStripe = {
  balance: { retrieve: mockBalanceRetrieve },
  payouts: { create: mockPayoutsCreate },
};

jest.mock('stripe', () => jest.fn().mockImplementation(() => mockStripe));

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

describe('stripe-payout API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBalanceRetrieve.mockResolvedValue({
      available: [{ currency: 'usd', amount: 5000 }],
    });
    mockPayoutsCreate.mockResolvedValue({
      id: 'po_123',
      status: 'pending',
      amount: 5000,
      currency: 'usd',
      arrival_date: Math.floor(Date.now() / 1000) + 86400 * 3,
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/stripe-payout')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Stripe not configured', async () => {
    const orig = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/stripe-payout')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Stripe is not configured' });
    process.env.STRIPE_SECRET_KEY = orig;
    jest.resetModules();
  });

  it('returns 400 when userId missing or invalid', async () => {
    const handler = (await import('@/pages/api/stripe-payout')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 400 when no balance available', async () => {
    mockBalanceRetrieve.mockResolvedValueOnce({
      available: [{ currency: 'usd', amount: 0 }],
    });
    const handler = (await import('@/pages/api/stripe-payout')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No balance available to transfer' });
  });

  it('returns 400 when Stripe instant payouts not enabled', async () => {
    mockPayoutsCreate.mockRejectedValueOnce(
      Object.assign(new Error('Instant payouts are not enabled'), {
        code: 'STRIPE_ERROR',
        raw: { message: 'Instant payouts are not enabled' },
      })
    );
    const handler = (await import('@/pages/api/stripe-payout')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', instant: true } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Instant payouts are not enabled; use standard payout.',
    });
  });

  it('returns 200 with payout when success', async () => {
    const handler = (await import('@/pages/api/stripe-payout')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      payout: expect.objectContaining({
        id: 'po_123',
        status: 'pending',
        amount: 5000,
        currency: 'usd',
      }),
    });
    expect(mockPayoutsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        currency: 'usd',
        method: 'standard',
      })
    );
  });

  it('uses amountCents when provided and caps at available', async () => {
    const handler = (await import('@/pages/api/stripe-payout')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', amountCents: 2000 } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPayoutsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2000 })
    );
  });
});
