/**
 * Unit tests for pages/api/integrations/index.js
 * GET: list integrations for org; POST: save or test provider. RBAC: owner or developer.
 */

const mockListOrgIntegrations = jest.fn();
const mockGetOrgIntegration = jest.fn();
const mockSaveOrgIntegration = jest.fn();
jest.mock('@/lib/integrations/get-org-integration', () => ({
  listOrgIntegrations: (...args) => mockListOrgIntegrations(...args),
  getOrgIntegrationSummary: jest.fn(),
  getOrgIntegration: (...args) => mockGetOrgIntegration(...args),
  saveOrgIntegration: (...args) => mockSaveOrgIntegration(...args),
}));

const mockValidateStripeConfig = jest.fn();
const mockStripeMetadataFromConfig = jest.fn();
jest.mock('@/lib/integrations/providers/stripe', () => ({
  validateStripeConfig: (...args) => mockValidateStripeConfig(...args),
  stripeMetadataFromConfig: (...args) => mockStripeMetadataFromConfig(...args),
}));

const mockValidateTwilioConfig = jest.fn();
const mockTwilioMetadataFromConfig = jest.fn();
jest.mock('@/lib/integrations/providers/twilio', () => ({
  validateTwilioConfig: (...args) => mockValidateTwilioConfig(...args),
  twilioMetadataFromConfig: (...args) => mockTwilioMetadataFromConfig(...args),
}));

const mockValidateMailchimpConfig = jest.fn();
const mockMailchimpMetadataFromConfig = jest.fn();
jest.mock('@/lib/integrations/providers/mailchimp', () => ({
  validateMailchimpConfig: (...args) => mockValidateMailchimpConfig(...args),
  mailchimpMetadataFromConfig: (...args) => mockMailchimpMetadataFromConfig(...args),
}));

const mockValidateResendConfig = jest.fn();
const mockResendMetadataFromConfig = jest.fn();
jest.mock('@/lib/integrations/providers/resend', () => ({
  validateResendConfig: (...args) => mockValidateResendConfig(...args),
  resendMetadataFromConfig: (...args) => mockResendMetadataFromConfig(...args),
}));

const mockListProviders = jest.fn();
jest.mock('@/lib/integrations/registry', () => ({
  listProviders: (...args) => mockListProviders(...args),
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

const defaultProviders = [
  { provider: 'stripe', name: 'Stripe', description: 'Payments' },
  { provider: 'twilio', name: 'Twilio', description: 'SMS' },
  { provider: 'mailchimp', name: 'Mailchimp', description: 'Email' },
  { provider: 'resend', name: 'Resend', description: 'Email' },
];

describe('pages/api/integrations/index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListProviders.mockReturnValue(defaultProviders);
    mockListOrgIntegrations.mockResolvedValue([]);
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: (col, val) => ({
              eq: (c2, v2) => Promise.resolve({ data: [{ role: 'superadmin' }], error: null }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-GET and non-POST', async () => {
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({ method: 'PATCH', query: {}, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { organizationId: 'org-1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });

    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when organizationId missing', async () => {
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { userId: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing organizationId' });
  });

  it('returns 503 when Supabase not available', async () => {
    mockCreateClient.mockImplementationOnce(() => null);
    jest.resetModules();
    const mod = await import('@/pages/api/integrations/index');
    const res = mockRes();
    await mod.default({
      method: 'GET',
      query: { userId: 'u1', organizationId: 'org-1' },
      body: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    mockCreateClient.mockImplementation(() => ({ from: mockFrom }));
    jest.resetModules();
    await import('@/pages/api/integrations/index');
  });

  it('returns 403 when user is not owner or developer', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [{ role: 'member' }], error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { userId: 'u1', organizationId: 'org-1' },
      body: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Only org owner or developer can manage integrations' });
  });

  it('GET returns 200 with integrations merged from list and registry', async () => {
    mockListOrgIntegrations.mockResolvedValue([
      { provider: 'stripe', status: 'connected', metadata_json: { publishableKeySuffix: '1234' }, last_validated_at: '2024-01-01T00:00:00Z' },
    ]);
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { userId: 'u1', organizationId: 'org-1' },
      body: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      integrations: expect.arrayContaining([
        expect.objectContaining({
          provider: 'stripe',
          name: 'Stripe',
          description: 'Payments',
          status: 'connected',
          metadata: { publishableKeySuffix: '1234' },
          lastValidatedAt: '2024-01-01T00:00:00Z',
        }),
        expect.objectContaining({ provider: 'twilio', status: 'pending', metadata: {} }),
      ]),
    });
    expect(mockListOrgIntegrations).toHaveBeenCalledWith('org-1');
  });

  it('POST returns 400 for invalid provider', async () => {
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', provider: 'invalid', action: 'test' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid provider' });
  });

  it('POST returns 400 for invalid action', async () => {
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', provider: 'stripe', action: 'delete' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid action; use save or test' });
  });

  it('POST action=test returns 200 with validation result', async () => {
    mockValidateStripeConfig.mockResolvedValue({ ok: true, status: 'connected' });
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', provider: 'stripe', action: 'test', config: { secretKey: 'sk_test_xxx' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, error: undefined, status: 'connected' });
    expect(mockValidateStripeConfig).toHaveBeenCalledWith({ secretKey: 'sk_test_xxx' });
  });

  it('POST action=test uses saved config when config not in body', async () => {
    mockGetOrgIntegration.mockResolvedValue({ config: { secretKey: 'sk_saved' }, row: {} });
    mockValidateStripeConfig.mockResolvedValue({ ok: true, status: 'connected' });
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', provider: 'stripe', action: 'test' },
    }, res);
    expect(mockGetOrgIntegration).toHaveBeenCalledWith('org-1', 'stripe');
    expect(mockValidateStripeConfig).toHaveBeenCalledWith({ secretKey: 'sk_saved' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('POST action=test returns 400 when no config to test', async () => {
    mockGetOrgIntegration.mockResolvedValue(null);
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', provider: 'stripe', action: 'test' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No config to test; save credentials first or send config in request' });
  });

  it('POST action=test returns 500 when validator throws', async () => {
    mockValidateStripeConfig.mockRejectedValue(new Error('Stripe API error'));
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', provider: 'stripe', action: 'test', config: { secretKey: 'sk_xxx' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Stripe API error' });
  });

  it('POST action=save returns 400 when config missing', async () => {
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', provider: 'stripe', action: 'save' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing config object' });
  });

  it('POST action=save returns 200 and calls saveOrgIntegration', async () => {
    mockValidateStripeConfig.mockResolvedValue({ ok: true, status: 'connected' });
    mockStripeMetadataFromConfig.mockReturnValue({ publishableKeySuffix: '1234' });
    mockSaveOrgIntegration.mockResolvedValue({});
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        organizationId: 'org-1',
        provider: 'stripe',
        action: 'save',
        config: { secretKey: 'sk_xxx', publishableKey: 'pk_xxx' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, status: 'connected' });
    expect(mockSaveOrgIntegration).toHaveBeenCalledWith(
      'org-1',
      'stripe',
      { secretKey: 'sk_xxx', publishableKey: 'pk_xxx' },
      { publishableKeySuffix: '1234' },
      'connected'
    );
  });

  it('POST action=save uses status invalid when validation fails', async () => {
    mockValidateStripeConfig.mockResolvedValue({ ok: false, error: 'Invalid key', status: 'invalid' });
    mockStripeMetadataFromConfig.mockReturnValue({});
    mockSaveOrgIntegration.mockResolvedValue({});
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        organizationId: 'org-1',
        provider: 'stripe',
        action: 'save',
        config: { secretKey: 'bad' },
      },
    }, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, status: 'invalid' });
    expect(mockSaveOrgIntegration).toHaveBeenCalledWith(
      'org-1',
      'stripe',
      { secretKey: 'bad' },
      {},
      'invalid'
    );
  });

  it('POST action=save returns 500 when saveOrgIntegration returns error', async () => {
    mockValidateStripeConfig.mockResolvedValue({ ok: true });
    mockStripeMetadataFromConfig.mockReturnValue({});
    mockSaveOrgIntegration.mockResolvedValue({ error: 'Database error' });
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        organizationId: 'org-1',
        provider: 'stripe',
        action: 'save',
        config: { secretKey: 'sk_xxx' },
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
  });

  it('returns 500 when org_members query errors', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/integrations/index')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { userId: 'u1', organizationId: 'org-1' },
      body: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
  });
});
