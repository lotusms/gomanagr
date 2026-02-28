/**
 * Unit tests for create-client-online-resource API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId or clientId missing
 * - Returns 201 with id and resource when insert succeeds
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

describe('create-client-online-resource API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'client_online_resources') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'new-resource-id' },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/create-client-online-resource')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or clientId is missing', async () => {
    const handler = (await import('@/pages/api/create-client-online-resource')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or clientId' });
  });

  it('returns 201 with id and resource when insert succeeds', async () => {
    const handler = (await import('@/pages/api/create-client-online-resource')).default;
    const req = {
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        resource_name: 'Client Drive',
        url: 'https://drive.example.com',
        resource_type: 'google_drive_folder',
      },
    };
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-resource-id',
        resource: expect.objectContaining({
          id: 'new-resource-id',
          client_id: 'c1',
          user_id: 'u1',
          resource_name: 'Client Drive',
          url: 'https://drive.example.com',
          resource_type: 'google_drive_folder',
        }),
      })
    );
  });
});
