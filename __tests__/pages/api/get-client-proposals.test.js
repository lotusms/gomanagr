/**
 * Unit tests for get-client-proposals API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId or clientId missing
 * - Returns 200 with proposals array when successful
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

describe('get-client-proposals API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              order: () => ({
                order: () =>
                  Promise.resolve({
                    data: [{ id: 'p1', proposal_title: 'Proposal One', client_id: 'c1' }],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      }),
    });
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/get-client-proposals')).default;
    const req = { method: 'GET', body: {} };
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or clientId is missing', async () => {
    const handler = (await import('@/pages/api/get-client-proposals')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or clientId' });
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with proposals array when query succeeds', async () => {
    const handler = (await import('@/pages/api/get-client-proposals')).default;
    const req = { method: 'POST', body: { userId: 'u1', clientId: 'c1' } };
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      proposals: [{ id: 'p1', proposal_title: 'Proposal One', client_id: 'c1' }],
    });
  });
});
