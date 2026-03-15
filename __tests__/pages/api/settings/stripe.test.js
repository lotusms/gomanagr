/**
 * Unit tests for pages/api/settings/stripe.js
 * GET: masked Stripe config; POST: save (app_settings or organization_integrations). RBAC: superadmin or developer.
 */

const mockGetStripeConfig = jest.fn();
const mockGetStripeConfigForSettings = jest.fn();
const mockSaveStripeConfig = jest.fn();
jest.mock('@/lib/getStripeConfig', () => ({
  getStripeConfig: (...args) => mockGetStripeConfig(...args),
  getStripeConfigForSettings: (...args) => mockGetStripeConfigForSettings(...args),
  saveStripeConfig: (...args) => mockSaveStripeConfig(...args),
}));

const mockSaveOrgIntegration = jest.fn();
jest.mock('@/lib/integrations/get-org-integration', () => ({
  saveOrgIntegration: (...args) => mockSaveOrgIntegration(...args),
}));

const mockValidateStripeConfig = jest.fn();
const mockStripeMetadataFromConfig = jest.fn();
jest.mock('@/lib/integrations/providers/stripe', () => ({
  validateStripeConfig: (...args) => mockValidateStripeConfig(...args),
  stripeMetadataFromConfig: (...args) => mockStripeMetadataFromConfig(...args),
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

function orgMembersChain(result = { data: [{ role: 'superadmin' }], error: null }) {
  const promise = Promise.resolve(result);
  const chain = {
    eq: (c2, v2) => promise,
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  };
  return chain;
}

describe('pages/api/settings/stripe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: (col, val) => orgMembersChain(),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-GET and non-POST', async () => {
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({ method: 'PUT', query: {}, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: {}, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 503 when Supabase not available', async () => {
    mockCreateClient.mockImplementationOnce(() => null);
    jest.resetModules();
    const mod = await import('@/pages/api/settings/stripe');
    const res = mockRes();
    await mod.default({ method: 'GET', query: { userId: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    mockCreateClient.mockImplementation(() => ({ from: mockFrom }));
    jest.resetModules();
    await import('@/pages/api/settings/stripe');
  });

  it('returns 403 when user is not superadmin or developer', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: (col, val) => orgMembersChain({ data: [{ role: 'member' }], error: null }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { userId: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Only superadmin or developer can manage Stripe settings' });
  });

  it('POST returns 400 when publishableKey does not start with pk_', async () => {
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1', publishableKey: 'invalid' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Publishable key must start with pk_' });
  });

  it('POST returns 400 when secretKey does not start with sk_', async () => {
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1', secretKey: 'pk_xxx' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Secret key must start with sk_' });
  });

  it('POST returns 400 when webhookSecret does not start with whsec_', async () => {
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1', webhookSecret: 'invalid' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Webhook secret must start with whsec_' });
  });

  it('GET returns 200 with config from getStripeConfigForSettings', async () => {
    mockGetStripeConfigForSettings.mockResolvedValue({
      publishableKey: 'pk_test_xxx',
      secretKey: null,
      webhookSecret: null,
      paymentMethodConfigId: '',
    });
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { userId: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ publishableKey: 'pk_test_xxx' })
    );
    expect(mockGetStripeConfigForSettings).toHaveBeenCalledWith(null);
  });

  it('GET passes organizationId to getStripeConfigForSettings', async () => {
    mockGetStripeConfigForSettings.mockResolvedValue({});
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { userId: 'u1', organizationId: 'org-1' }, body: {} }, res);
    expect(mockGetStripeConfigForSettings).toHaveBeenCalledWith('org-1');
  });

  it('GET returns 500 when getStripeConfigForSettings throws', async () => {
    mockGetStripeConfigForSettings.mockRejectedValue(new Error('Load error'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { userId: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load Stripe config' });
    errSpy.mockRestore();
  });

  it('POST without organizationId returns 200 and calls saveStripeConfig', async () => {
    mockGetStripeConfig.mockResolvedValue({});
    mockSaveStripeConfig.mockResolvedValue({});
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1', publishableKey: 'pk_test_xxx', secretKey: 'sk_test_xxx' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(mockSaveStripeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ publishableKey: 'pk_test_xxx', secretKey: 'sk_test_xxx' }),
      {}
    );
    expect(mockSaveOrgIntegration).not.toHaveBeenCalled();
  });

  it('POST without organizationId returns 500 when saveStripeConfig returns error', async () => {
    mockGetStripeConfig.mockResolvedValue({});
    mockSaveStripeConfig.mockResolvedValue({ error: 'Save failed' });
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1', secretKey: 'sk_test_xxx' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Save failed' });
  });

  it('POST with organizationId validates and calls saveOrgIntegration', async () => {
    mockGetStripeConfig.mockResolvedValue({ publishableKey: 'pk_old', secretKey: 'sk_old', webhookSecret: '', paymentMethodConfigId: '' });
    mockValidateStripeConfig.mockResolvedValue({ ok: true });
    mockStripeMetadataFromConfig.mockReturnValue({ publishableKeySuffix: '1234' });
    mockSaveOrgIntegration.mockResolvedValue({});
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1', organizationId: 'org-1', secretKey: 'sk_test_xxx', publishableKey: 'pk_test_xxx' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(mockGetStripeConfig).toHaveBeenCalledWith('org-1');
    expect(mockValidateStripeConfig).toHaveBeenCalled();
    expect(mockSaveOrgIntegration).toHaveBeenCalledWith(
      'org-1',
      'stripe',
      expect.objectContaining({ secretKey: 'sk_test_xxx', publishableKey: 'pk_test_xxx' }),
      { publishableKeySuffix: '1234' },
      'connected'
    );
  });

  it('POST with organizationId returns 500 when saveOrgIntegration returns error', async () => {
    mockGetStripeConfig.mockResolvedValue({});
    mockValidateStripeConfig.mockResolvedValue({ ok: true });
    mockStripeMetadataFromConfig.mockReturnValue({});
    mockSaveOrgIntegration.mockResolvedValue({ error: 'DB error' });
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1', organizationId: 'org-1', secretKey: 'sk_test_xxx' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
  });

  it('POST with organizationId uses status invalid when validation fails', async () => {
    mockGetStripeConfig.mockResolvedValue({});
    mockValidateStripeConfig.mockResolvedValue({ ok: false });
    mockStripeMetadataFromConfig.mockReturnValue({});
    mockSaveOrgIntegration.mockResolvedValue({});
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1', organizationId: 'org-1', secretKey: 'sk_test_xxx' },
    }, res);
    expect(mockSaveOrgIntegration).toHaveBeenCalledWith(
      'org-1',
      'stripe',
      expect.any(Object),
      {},
      'invalid'
    );
  });

  it('POST returns 500 when getStripeConfig or save throws', async () => {
    mockGetStripeConfig.mockRejectedValue(new Error('Load error'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      query: {},
      body: { userId: 'u1', secretKey: 'sk_test_xxx' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save Stripe config' });
    errSpy.mockRestore();
  });

  it('returns 500 when org_members query errors', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: (col, val) => orgMembersChain({ data: null, error: { message: 'DB error' } }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/settings/stripe')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { userId: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
  });
});
