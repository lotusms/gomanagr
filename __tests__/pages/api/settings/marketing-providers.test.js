/**
 * Unit tests for pages/api/settings/marketing-providers.js
 * GET: masked config; POST: save config. RBAC: superadmin or developer.
 */

const mockGetMarketingConfig = jest.fn();
const mockGetMarketingConfigForSettings = jest.fn();
const mockSaveMarketingConfig = jest.fn();
jest.mock('@/lib/getMarketingConfig', () => ({
  getMarketingConfig: (...args) => mockGetMarketingConfig(...args),
  getMarketingConfigForSettings: (...args) => mockGetMarketingConfigForSettings(...args),
  saveMarketingConfig: (...args) => mockSaveMarketingConfig(...args),
}));

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

describe('pages/api/settings/marketing-providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ role: 'superadmin' }], error: null }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-GET and non-POST', async () => {
    const handler = (await import('@/pages/api/settings/marketing-providers')).default;
    const res = mockRes();
    await handler({ method: 'PATCH', query: {}, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/settings/marketing-providers')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: {}, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });

    await handler({ method: 'POST', query: {}, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 503 when Supabase not available', async () => {
    mockCreateClient.mockImplementationOnce(() => null);
    jest.resetModules();
    const mod = await import('@/pages/api/settings/marketing-providers');
    const res = mockRes();
    await mod.default({ method: 'GET', query: { userId: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    mockCreateClient.mockImplementation(() => ({ from: mockFrom }));
    jest.resetModules();
    await import('@/pages/api/settings/marketing-providers');
  });

  it('returns 403 when user is not superadmin or developer', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ role: 'member' }], error: null }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/settings/marketing-providers')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { userId: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Only superadmin or developer can manage marketing provider settings' });
  });

  it('GET returns 200 with config from getMarketingConfigForSettings', async () => {
    mockGetMarketingConfigForSettings.mockResolvedValue({
      defaultEmailProvider: 'resend',
      defaultSmsProvider: 'twilio',
      providers: [],
    });
    const handler = (await import('@/pages/api/settings/marketing-providers')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { userId: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      defaultEmailProvider: 'resend',
      defaultSmsProvider: 'twilio',
      providers: [],
    });
    expect(mockGetMarketingConfigForSettings).toHaveBeenCalled();
  });

  it('GET returns 500 when getMarketingConfigForSettings throws', async () => {
    mockGetMarketingConfigForSettings.mockRejectedValue(new Error('DB error'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const handler = (await import('@/pages/api/settings/marketing-providers')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { userId: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load marketing provider config' });
    errSpy.mockRestore();
  });

  it('POST returns 200 and calls saveMarketingConfig', async () => {
    mockGetMarketingConfig.mockResolvedValue({ providers: [] });
    mockSaveMarketingConfig.mockResolvedValue({});
    const handler = (await import('@/pages/api/settings/marketing-providers')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1', defaultEmailProvider: 'resend', providers: [] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(mockGetMarketingConfig).toHaveBeenCalled();
    expect(mockSaveMarketingConfig).toHaveBeenCalledWith(
      { userId: 'u1', defaultEmailProvider: 'resend', providers: [] },
      { providers: [] }
    );
  });

  it('POST returns 500 when saveMarketingConfig returns error', async () => {
    mockGetMarketingConfig.mockResolvedValue({});
    mockSaveMarketingConfig.mockResolvedValue({ error: 'Save failed' });
    const handler = (await import('@/pages/api/settings/marketing-providers')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Save failed' });
  });

  it('POST returns 500 when getMarketingConfig or saveMarketingConfig throws', async () => {
    mockGetMarketingConfig.mockRejectedValue(new Error('Load error'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const handler = (await import('@/pages/api/settings/marketing-providers')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save marketing provider config' });
    errSpy.mockRestore();
  });

  it('returns 500 when org_members query errors', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/settings/marketing-providers')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { userId: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
  });
});
