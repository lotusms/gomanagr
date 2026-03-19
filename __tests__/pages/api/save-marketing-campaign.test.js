/**
 * Unit tests for save-marketing-campaign API.
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

describe('save-marketing-campaign API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'c1', name: 'Updated' }, error: null }) }) }) }),
      }),
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: { id: 'c-new', name: 'New' }, error: null }) }),
      }),
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/save-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/save-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', campaign: { name: 'X' } } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or campaign missing', async () => {
    const handler = (await import('@/pages/api/save-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or campaign' });
  });

  it('returns 200 with campaign on update', async () => {
    const handler = (await import('@/pages/api/save-marketing-campaign')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', campaign: { id: 'c1', name: 'Updated', status: 'draft' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ campaign: expect.objectContaining({ id: 'c1' }) });
  });

  it('returns 201 with campaign on create', async () => {
    const handler = (await import('@/pages/api/save-marketing-campaign')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', campaign: { name: 'New Campaign', status: 'draft' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ campaign: expect.objectContaining({ id: 'c-new' }) });
  });

  it('returns 500 when update fails', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'db error' } }) }) }) }),
      }),
      insert: () => ({}),
    });
    const handler = (await import('@/pages/api/save-marketing-campaign')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', campaign: { id: 'c1', name: 'X', status: 'draft' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update campaign' });
  });
});
