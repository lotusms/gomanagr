/**
 * Unit tests for getMarketingConfig: getMarketingConfig, getMarketingConfigForSettings,
 * isMaskedValue, saveMarketingConfig, merge/org/global paths.
 */
const mockGetOrgIntegration = jest.fn();
jest.mock('@/lib/integrations/get-org-integration', () => ({
  getOrgIntegration: (...args) => mockGetOrgIntegration(...args),
}));

const mockFrom = jest.fn();
const mockSupabase = { from: mockFrom };
const mockCreateClient = jest.fn(() => mockSupabase);
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

describe('getMarketingConfig', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockGetOrgIntegration.mockResolvedValue(null);
    mockFrom.mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { value: { defaultEmailProvider: undefined, defaultSmsProvider: undefined, providers: [] } },
        error: null,
      }),
      upsert: jest.fn().mockReturnThis(),
    }));
  });

  describe('isMaskedValue', () => {
    it('returns false for null, undefined, non-string', () => {
      const { isMaskedValue } = require('@/lib/getMarketingConfig');
      expect(isMaskedValue(null)).toBe(false);
      expect(isMaskedValue(undefined)).toBe(false);
      expect(isMaskedValue(123)).toBe(false);
    });

    it('returns true for dotted mask pattern or empty string', () => {
      const { isMaskedValue } = require('@/lib/getMarketingConfig');
      expect(isMaskedValue('••••••••')).toBe(true);
      expect(isMaskedValue('pk_••••••••••••')).toBe(true);
      expect(isMaskedValue('  ')).toBe(true);
      expect(isMaskedValue('')).toBe(true);
    });

    it('returns false for plain secret', () => {
      const { isMaskedValue } = require('@/lib/getMarketingConfig');
      expect(isMaskedValue('sk_live_abc123')).toBe(false);
    });
  });

  describe('getMarketingConfig', () => {
    it('returns global config when no organizationId', async () => {
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig();
      expect(res).toHaveProperty('providers');
      expect(res.providers.length).toBeGreaterThan(0);
      expect(res.providers.some((p) => p.providerType === 'mailchimp')).toBe(true);
      expect(mockGetOrgIntegration).not.toHaveBeenCalled();
    });

    it('returns global config when organizationId is blank string', async () => {
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('   ');
      expect(res).toHaveProperty('providers');
      expect(mockGetOrgIntegration).not.toHaveBeenCalled();
    });

    it('merges org integrations with global when organizationId set', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ config: { apiKey: 're_xxx', senderEmail: 'noreply@test.com', senderName: 'Test' } });
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org1');
      expect(mockGetOrgIntegration).toHaveBeenCalled();
      const resend = res.providers.find((p) => p.providerType === 'resend');
      expect(resend).toBeDefined();
      expect(resend.enabled).toBe(true);
      expect(resend.apiKey).toBe('re_xxx');
    });
  });

  describe('getMarketingConfigForSettings', () => {
    it('returns config with apiKey and apiSecret masked', async () => {
      const storedResend = { providerType: 'resend', apiKey: 're_secret123', apiSecret: '', enabled: true, senderEmail: '', senderName: '' };
      mockFrom.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            value: {
              providers: [storedResend],
              defaultEmailProvider: undefined,
              defaultSmsProvider: undefined,
            },
          },
          error: null,
        }),
        upsert: jest.fn().mockReturnThis(),
      }));
      jest.resetModules();
      const { getMarketingConfigForSettings } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfigForSettings();
      const resend = res.providers.find((p) => p.providerType === 'resend');
      expect(resend).toBeDefined();
      expect(resend.apiKey).not.toBe('');
      expect(resend.apiKey).not.toBe('re_secret123');
      expect(resend.apiKey).toContain('•');
      expect(resend.apiSecret).toBe('');
    });
  });

  describe('saveMarketingConfig', () => {
    it('returns error when supabase unavailable', async () => {
      const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      const result = await saveMarketingConfig(
        { defaultEmailProvider: 'resend' },
        { defaultEmailProvider: undefined, defaultSmsProvider: undefined, providers: [] }
      );
      expect(result.error).toBe('Service unavailable');
      process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    });

    it('preserves existing secret when incoming apiKey is masked', async () => {
      const current = {
        defaultEmailProvider: undefined,
        defaultSmsProvider: undefined,
        providers: [
          { providerType: 'resend', apiKey: 're_keep', apiSecret: '', enabled: true, senderEmail: '', senderName: '' },
        ],
      };
      const incoming = {
        providers: [{ providerType: 'resend', apiKey: '••••••••••••', apiSecret: '', enabled: true }],
      };
      const mockUpsert = jest.fn().mockImplementation((payload) => {
        const resend = payload?.value?.providers?.find((p) => p.providerType === 'resend');
        expect(resend?.apiKey).toBe('re_keep');
        return Promise.resolve({ error: null });
      });
      mockFrom.mockImplementation(() => ({ upsert: mockUpsert }));
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      const result = await saveMarketingConfig(incoming, current);
      expect(result.error).toBeUndefined();
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('upserts app_settings and returns empty on success', async () => {
      const current = {
        defaultEmailProvider: undefined,
        defaultSmsProvider: undefined,
        providers: [{ providerType: 'resend', apiKey: '', apiSecret: '', enabled: false, senderEmail: '', senderName: '' }],
      };
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation((table) => {
        expect(table).toBe('app_settings');
        return { upsert: mockUpsert };
      });
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      const result = await saveMarketingConfig({ defaultEmailProvider: 'resend' }, current);
      expect(result).toEqual({});
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('returns error when supabase upsert fails', async () => {
      mockFrom.mockImplementation(() => ({
        upsert: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      }));
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      const result = await saveMarketingConfig({}, { providers: [], defaultEmailProvider: undefined, defaultSmsProvider: undefined });
      expect(result.error).toBe('DB error');
    });
  });
});
