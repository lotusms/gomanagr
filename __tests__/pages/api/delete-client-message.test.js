/**
 * Unit tests for delete-client-message API.
 */
const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
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
describe('delete-client-message API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    let callCount = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_messages') {
        callCount++;
        if (callCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { id: 'message-1', user_id: 'u1', organization_id: null },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
  });
  it('returns 405 when method is not POST or DELETE', async () => {
    const handler = (await import('@/pages/api/delete-client-message')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
  it('returns 400 when userId or messageId is missing', async () => {
    const handler = (await import('@/pages/api/delete-client-message')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('returns 404 when message not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_messages') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/delete-client-message')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', messageId: 'missing' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('returns 200 when delete succeeds', async () => {
    const handler = (await import('@/pages/api/delete-client-message')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', messageId: 'message-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
