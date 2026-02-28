const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});
function mockRes() {
  return {
    status: jest.fn(function (code) { this.statusCode = code; return this; }),
    json: jest.fn(function (data) { this._json = data; return this; }),
  };
}
describe('update-client-message API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    let n = 0;
    mockFrom.mockImplementation((t) => {
      if (t !== 'client_messages') return {};
      n++;
      if (n === 1) {
        return {
          select: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: { id: 'message-1', user_id: 'u1', organization_id: null }, error: null }) }) }) }),
        };
      }
      return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
    });
  });
  it('returns 405 for non-POST', async () => {
    const h = (await import('@/pages/api/update-client-message')).default;
    const res = mockRes();
    await h({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
  it('returns 400 when userId or messageId missing', async () => {
    const h = (await import('@/pages/api/update-client-message')).default;
    const res = mockRes();
    await h({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('returns 200 when update succeeds', async () => {
    const h = (await import('@/pages/api/update-client-message')).default;
    const res = mockRes();
    await h({ method: 'POST', body: { userId: 'u1', messageId: 'message-1', channel: 'sms', direction: 'sent', author: 'L. Silva', body: 'b' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
