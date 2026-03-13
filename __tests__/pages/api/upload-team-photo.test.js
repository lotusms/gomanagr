/**
 * Unit tests for upload-team-photo API.
 * POST only; 503; 400 missing userId/memberId/photoData; 500 upload error; 200 with photoUrl.
 */

const mockUpload = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: jest.fn(),
    storage: {
      from: (bucket) => ({
        upload: (...args) => mockUpload(...args),
        getPublicUrl: (path) => ({
          data: { publicUrl: `https://storage.example.com/${bucket}/${path}` },
        }),
      }),
    },
  }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
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

describe('upload-team-photo API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({
      data: { path: 'u1/m1/photo.png' },
      error: null,
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/upload-team-photo')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/upload-team-photo')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', memberId: 'm1', photoData: { base64: 'abc' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId, memberId, or photoData.base64 missing', async () => {
    const handler = (await import('@/pages/api/upload-team-photo')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', memberId: 'm1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing userId, memberId, or photoData',
    });
  });

  it('returns 500 when storage upload fails', async () => {
    mockUpload.mockResolvedValueOnce({
      data: null,
      error: { message: 'upload failed' },
    });
    const handler = (await import('@/pages/api/upload-team-photo')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        memberId: 'm1',
        photoData: { base64: 'data:image/png;base64,iVBORw0KGgo=' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to upload team photo', details: 'upload failed' })
    );
  });

  it('returns 200 with photoUrl and photoPath when upload succeeds', async () => {
    const handler = (await import('@/pages/api/upload-team-photo')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        memberId: 'm1',
        photoData: { base64: 'data:image/png;base64,iVBORw0KGgo=' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        photoUrl: expect.any(String),
        photoPath: expect.any(String),
      })
    );
  });
});
