/**
 * Unit tests for upload-client-attachment API.
 */

const mockStorage = {
  createBucket: jest.fn().mockResolvedValue({ error: null }),
  from: jest.fn(),
  getPublicUrl: jest.fn(),
};
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: jest.fn(),
    storage: mockStorage,
  }),
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

describe('upload-client-attachment API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.from.mockReturnValue({
      upload: () =>
        Promise.resolve({
          data: { path: 'u1/c1/123-abc-file.pdf' },
          error: null,
        }),
      getPublicUrl: () => ({
        data: { publicUrl: 'https://storage.example/public/u1/c1/123-abc-file.pdf' },
      }),
    });
  });

  it('returns 405 when method is not POST', async () => {
    const h = (await import('@/pages/api/upload-client-attachment')).default;
    const res = mockRes();
    await h({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 when required fields are missing', async () => {
    const h = (await import('@/pages/api/upload-client-attachment')).default;
    const res = mockRes();
    await h({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with url when upload succeeds', async () => {
    const h = (await import('@/pages/api/upload-client-attachment')).default;
    const res = mockRes();
    await h({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        filename: 'doc.pdf',
        contentType: 'application/pdf',
        base64: 'data:application/pdf;base64,JVBERi0x',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      url: 'https://storage.example/public/u1/c1/123-abc-file.pdf',
    });
  });
});
