/**
 * Unit tests for upload-organization-logo API.
 * POST only; 503; 400 missing organizationId/logoData; 500 upload/update error; 200 with logoUrl.
 */

const mockFrom = jest.fn();
const mockUpload = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
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

describe('upload-organization-logo API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({
      data: { path: 'org-1/logo/logo.png' },
      error: null,
    });
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/upload-organization-logo')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/upload-organization-logo')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', logoData: { base64: 'abc123' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when organizationId or logoData.base64 missing', async () => {
    const handler = (await import('@/pages/api/upload-organization-logo')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing organizationId or logoData' });
  });

  it('returns 500 when storage upload fails', async () => {
    mockUpload.mockResolvedValueOnce({
      data: null,
      error: { message: 'upload failed' },
    });
    const handler = (await import('@/pages/api/upload-organization-logo')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        logoData: { base64: 'data:image/png;base64,iVBORw0KGgo=' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to upload logo', details: 'upload failed' })
    );
  });

  it('returns 200 with logoUrl when upload and update succeed', async () => {
    const handler = (await import('@/pages/api/upload-organization-logo')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        logoData: { base64: 'data:image/png;base64,iVBORw0KGgo=' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        logoUrl: expect.any(String),
        logoPath: expect.any(String),
      })
    );
  });

  it('returns 200 with altLogoUrl when isAltLogo is true', async () => {
    const handler = (await import('@/pages/api/upload-organization-logo')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        logoData: { base64: 'data:image/png;base64,iVBORw0KGgo=' },
        isAltLogo: true,
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        altLogoUrl: expect.any(String),
      })
    );
  });
});
