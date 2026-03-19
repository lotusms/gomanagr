/**
 * Unit tests for get-marketing-campaign API.
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

describe('get-marketing-campaign API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { id: 'c1', name: 'My Campaign', user_id: 'u1' },
              error: null,
            }),
        }),
      }),
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', campaignId: 'c1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or campaignId missing', async () => {
    const handler = (await import('@/pages/api/get-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or campaignId' });
  });

  it('returns 404 when campaign not found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
        }),
      }),
    });
    const handler = (await import('@/pages/api/get-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', campaignId: 'c1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Campaign not found' });
  });

  it('returns 403 when campaign belongs to another user', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { id: 'c1', name: 'Other', user_id: 'other-user' },
              error: null,
            }),
        }),
      }),
    });
    const handler = (await import('@/pages/api/get-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', campaignId: 'c1' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('returns 200 with campaign', async () => {
    const handler = (await import('@/pages/api/get-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', campaignId: 'c1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      campaign: expect.objectContaining({ id: 'c1', name: 'My Campaign', user_id: 'u1' }),
    });
  });
});
