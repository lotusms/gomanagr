/**
 * Unit tests for delete-marketing-campaign API.
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

describe('delete-marketing-campaign API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/delete-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/delete-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', campaignId: 'c1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or campaignId missing', async () => {
    const handler = (await import('@/pages/api/delete-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or campaignId' });
  });

  it('returns 500 when delete fails', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: { message: 'db error' } }) }) }),
    });
    const handler = (await import('@/pages/api/delete-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', campaignId: 'c1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete campaign' });
  });

  it('returns 200 on success', async () => {
    const handler = (await import('@/pages/api/delete-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', campaignId: 'c1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
