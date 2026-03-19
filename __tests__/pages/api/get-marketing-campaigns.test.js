/**
 * Unit tests for get-marketing-campaigns API.
 */

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mockFrom }) }));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return {
    status: jest.fn(function (c) { this.statusCode = c; return this; }),
    setHeader: jest.fn(),
    json: jest.fn(function (d) { this._json = d; return this; }),
  };
}

describe('get-marketing-campaigns API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const thenable = Promise.resolve({
      data: [{ id: 'c1', name: 'Campaign 1', user_id: 'u1' }],
      error: null,
    });
    const chain = { eq: () => chain, is: () => chain };
    chain.then = thenable.then.bind(thenable);
    chain.catch = thenable.catch.bind(thenable);
    mockFrom.mockReturnValue({
      select: () => ({ order: () => chain }),
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-marketing-campaigns')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-marketing-campaigns')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/get-marketing-campaigns')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 500 when query fails', async () => {
    const failThenable = Promise.resolve({ data: null, error: { message: 'db error' } });
    const failChain = { eq: () => failChain, is: () => failChain };
    failChain.then = failThenable.then.bind(failThenable);
    failChain.catch = failThenable.catch.bind(failThenable);
    mockFrom.mockReturnValue({
      select: () => ({ order: () => failChain }),
    });
    const handler = (await import('@/pages/api/get-marketing-campaigns')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load campaigns' });
  });

  it('returns 200 with campaigns array', async () => {
    const handler = (await import('@/pages/api/get-marketing-campaigns')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ campaigns: expect.any(Array) });
    expect(res.json.mock.calls[0][0].campaigns).toHaveLength(1);
    expect(res.json.mock.calls[0][0].campaigns[0].name).toBe('Campaign 1');
  });
});
