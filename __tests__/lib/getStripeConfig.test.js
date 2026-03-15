/**
 * Unit tests for getStripeConfig: getStripeConfig, getStripeConfigForSettings, saveStripeConfig.
 * Covers global vs org, masked output, fallback when org has no valid secretKey.
 */
const mockGetOrgIntegration = jest.fn();
const mockGetOrgIntegrationSummary = jest.fn();
jest.mock('@/lib/integrations/get-org-integration', () => ({
  getOrgIntegration: (...args) => mockGetOrgIntegration(...args),
  getOrgIntegrationSummary: (...args) => mockGetOrgIntegrationSummary(...args),
}));

const mockFrom = jest.fn();
const mockSupabase = { from: mockFrom };
const mockCreateClient = jest.fn(() => mockSupabase);
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

describe('getStripeConfig', () => {
  const origEnv = {};
  beforeAll(() => {
    origEnv.URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    origEnv.KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    origEnv.PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    origEnv.SK = process.env.STRIPE_SECRET_KEY;
    origEnv.WH = process.env.STRIPE_WEBHOOK_SECRET;
    origEnv.PMC = process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_env';
    process.env.STRIPE_SECRET_KEY = 'sk_test_env';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_env';
    process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID = 'pmc_env';
  });
  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origEnv.URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origEnv.KEY;
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = origEnv.PK;
    process.env.STRIPE_SECRET_KEY = origEnv.SK;
    process.env.STRIPE_WEBHOOK_SECRET = origEnv.WH;
    process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID = origEnv.PMC;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockGetOrgIntegration.mockResolvedValue(null);
    mockGetOrgIntegrationSummary.mockResolvedValue(null);
    mockFrom.mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    }));
  });

  describe('getStripeConfig', () => {
    it('returns global config from env when no organizationId', async () => {
      const { getStripeConfig } = require('@/lib/getStripeConfig');
      const res = await getStripeConfig();
      expect(res.publishableKey).toBe('pk_test_env');
      expect(res.secretKey).toBe('sk_test_env');
      expect(mockGetOrgIntegration).not.toHaveBeenCalled();
    });

    it('returns org config when org has valid secretKey (starts with sk_)', async () => {
      mockGetOrgIntegration.mockResolvedValueOnce({
        config: {
          publishableKey: 'pk_live_org',
          secretKey: 'sk_live_org',
          webhookSecret: 'whsec_org',
          paymentMethodConfigId: 'pmc_org',
        },
      });
      const { getStripeConfig } = require('@/lib/getStripeConfig');
      const res = await getStripeConfig('org1');
      expect(res.publishableKey).toBe('pk_live_org');
      expect(res.secretKey).toBe('sk_live_org');
      expect(res.webhookSecret).toBe('whsec_org');
      expect(res.paymentMethodConfigId).toBe('pmc_org');
      expect(mockGetOrgIntegration).toHaveBeenCalledWith('org1', 'stripe');
    });

    it('falls back to global when org has no config', async () => {
      mockGetOrgIntegration.mockResolvedValueOnce(null);
      const { getStripeConfig } = require('@/lib/getStripeConfig');
      const res = await getStripeConfig('org1');
      expect(res.publishableKey).toBe('pk_test_env');
      expect(res.secretKey).toBe('sk_test_env');
    });

    it('falls back to global when org secretKey does not start with sk_', async () => {
      mockGetOrgIntegration.mockResolvedValueOnce({
        config: { publishableKey: 'pk_org', secretKey: 'invalid', webhookSecret: '', paymentMethodConfigId: '' },
      });
      const { getStripeConfig } = require('@/lib/getStripeConfig');
      const res = await getStripeConfig('org1');
      expect(res.publishableKey).toBe('pk_test_env');
      expect(res.secretKey).toBe('sk_test_env');
    });

    it('returns global from app_settings when DB has value', async () => {
      mockFrom.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            value: {
              publishableKey: 'pk_db',
              secretKey: 'sk_db',
              webhookSecret: 'whsec_db',
              paymentMethodConfigId: 'pmc_db',
            },
          },
          error: null,
        }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      }));
      const { getStripeConfig } = require('@/lib/getStripeConfig');
      const res = await getStripeConfig();
      expect(res.publishableKey).toBe('pk_db');
      expect(res.secretKey).toBe('sk_db');
    });

    it('returns fromEnv when app_settings error or invalid data', async () => {
      mockFrom.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'err' } }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      }));
      const { getStripeConfig } = require('@/lib/getStripeConfig');
      const res = await getStripeConfig();
      expect(res.publishableKey).toBe('pk_test_env');
    });
  });

  describe('getStripeConfigForSettings', () => {
    it('returns global source with masked secrets when no organizationId', async () => {
      const { getStripeConfigForSettings } = require('@/lib/getStripeConfig');
      const res = await getStripeConfigForSettings();
      expect(res.source).toBe('global');
      expect(res.publishableKey).toBe('pk_test_env');
      expect(res.secretKeyMasked).toContain('••••••••••••');
      expect(res.webhookSecretMasked).toContain('••••••••••••');
    });

    it('returns organization source with masked secrets when organizationId set', async () => {
      mockGetOrgIntegrationSummary.mockResolvedValueOnce({ status: 'connected' });
      mockGetOrgIntegration.mockResolvedValueOnce({
        config: {
          publishableKey: 'pk_org',
          secretKey: 'sk_live_xxx',
          webhookSecret: 'whsec_yyy',
          paymentMethodConfigId: 'pmc_org',
        },
      });
      const { getStripeConfigForSettings } = require('@/lib/getStripeConfig');
      const res = await getStripeConfigForSettings('org1');
      expect(res.source).toBe('organization');
      expect(res.status).toBe('connected');
      expect(res.publishableKey).toBe('pk_org');
      expect(res.secretKeyMasked).toMatch(/^sk_live.*•+$/);
      expect(res.webhookSecretMasked).toMatch(/^whsec_yy.*•+$/);
    });
  });

  describe('saveStripeConfig', () => {
    it('returns error when supabase unavailable', async () => {
      const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      jest.resetModules();
      const { saveStripeConfig } = require('@/lib/getStripeConfig');
      const result = await saveStripeConfig(
        { publishableKey: 'pk_new' },
        { publishableKey: '', secretKey: '', webhookSecret: '', paymentMethodConfigId: '' }
      );
      expect(result.error).toBe('Service unavailable');
      process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    });

    it('upserts and returns empty on success', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ upsert: mockUpsert }));
      jest.resetModules();
      const { saveStripeConfig } = require('@/lib/getStripeConfig');
      const current = { publishableKey: 'pk', secretKey: 'sk', webhookSecret: 'wh', paymentMethodConfigId: '' };
      const result = await saveStripeConfig({ publishableKey: 'pk_new' }, current);
      expect(result).toEqual({});
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'stripe',
          value: expect.objectContaining({ publishableKey: 'pk_new', secretKey: 'sk' }),
        }),
        expect.any(Object)
      );
    });

    it('returns error when upsert fails', async () => {
      mockFrom.mockImplementation(() => ({
        upsert: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      }));
      jest.resetModules();
      const { saveStripeConfig } = require('@/lib/getStripeConfig');
      const current = { publishableKey: '', secretKey: '', webhookSecret: '', paymentMethodConfigId: '' };
      const result = await saveStripeConfig({}, current);
      expect(result.error).toBe('DB error');
    });
  });
});
