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

  describe('maskSecret', () => {
    it('returns null for empty, non-string, or whitespace-only', () => {
      const { maskSecret } = require('@/lib/getMarketingConfig');
      expect(maskSecret(null)).toBeNull();
      expect(maskSecret(undefined)).toBeNull();
      expect(maskSecret(1)).toBeNull();
      expect(maskSecret('')).toBeNull();
      expect(maskSecret('   ')).toBeNull();
    });

    it('returns full mask for short secrets and prefix mask for long secrets', () => {
      const { maskSecret } = require('@/lib/getMarketingConfig');
      expect(maskSecret('short')).toMatch(/^•+$/);
      expect(maskSecret('long_secret_value')).toContain('•');
      expect(maskSecret('long_secret_value')).toMatch(/^long/);
    });
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
    it('returns default global config when Supabase env is not configured', async () => {
      const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      jest.resetModules();
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig();
      expect(res.providers).toHaveLength(4);
      process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    });

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

    it('merges Mailchimp org integration', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce({
          config: {
            apiKey: 'mc_key',
            apiSecret: 'mc_sec',
            senderEmail: 'm@x.com',
            senderName: 'M',
            fromNumber: '+1555',
            smsEnabled: true,
          },
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-mc');
      const mc = res.providers.find((p) => p.providerType === 'mailchimp');
      expect(mc.enabled).toBe(true);
      expect(mc.apiKey).toBe('mc_key');
      expect(mc.smsEnabled).toBe(true);
    });

    it('merges Mailchimp with null apiKey', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce({
          config: {
            apiKey: null,
            apiSecret: 's',
            senderEmail: '',
            senderName: '',
            fromNumber: '',
            smsEnabled: false,
          },
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-mc-nullkey');
      const mc = res.providers.find((p) => p.providerType === 'mailchimp');
      expect(mc.apiKey).toBe('');
    });

    it('merges Mailchimp with explicit null apiSecret', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce({
          config: {
            apiKey: 'k',
            apiSecret: null,
            senderEmail: 'e@x.com',
            senderName: 'n',
            fromNumber: '+1',
            smsEnabled: true,
          },
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-mc-nullsec');
      const mc = res.providers.find((p) => p.providerType === 'mailchimp');
      expect(mc.apiSecret).toBe('');
    });

    it('merges Mailchimp with smsEnabled false', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce({
          config: {
            apiKey: 'k',
            apiSecret: 's',
            senderEmail: '',
            senderName: '',
            fromNumber: '',
            smsEnabled: false,
          },
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-mc-sms');
      const mc = res.providers.find((p) => p.providerType === 'mailchimp');
      expect(mc.smsEnabled).toBe(false);
    });

    it('merges Mailchimp with only apiKey so other fields use nullish defaults', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce({ config: { apiKey: 'only' } })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-mc2');
      const mc = res.providers.find((p) => p.providerType === 'mailchimp');
      expect(mc.apiKey).toBe('only');
      expect(mc.apiSecret).toBe('');
      expect(mc.senderEmail).toBe('');
      expect(mc.smsEnabled).toBe(false);
    });

    it('merges Twilio org integration', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ config: { accountSid: 'ACxx', authToken: 'tok', fromNumber: '+1999' } })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-tw');
      const tw = res.providers.find((p) => p.providerType === 'twilio');
      expect(tw.enabled).toBe(true);
      expect(tw.apiKey).toBe('ACxx');
      expect(tw.apiSecret).toBe('tok');
    });

    it('merges Twilio with null accountSid, authToken, and fromNumber', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ config: { accountSid: null, authToken: null, fromNumber: null } })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-tw-null');
      const tw = res.providers.find((p) => p.providerType === 'twilio');
      expect(tw.apiKey).toBe('');
      expect(tw.apiSecret).toBe('');
      expect(tw.fromNumber).toBe('');
    });

    it('merges Resend with only apiKey', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ config: { apiKey: 're_only' } })
        .mockResolvedValueOnce(null);
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-re');
      const re = res.providers.find((p) => p.providerType === 'resend');
      expect(re.apiKey).toBe('re_only');
      expect(re.senderEmail).toBe('');
    });

    it('merges Resend with null apiKey and nullish sender fields', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ config: { apiKey: null, senderEmail: null, senderName: null } })
        .mockResolvedValueOnce(null);
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-re-null');
      const re = res.providers.find((p) => p.providerType === 'resend');
      expect(re.apiKey).toBe('');
      expect(re.senderEmail).toBe('');
    });

    it('maps SMTP null password to empty apiSecret in org integration', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          config: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            user: 'u',
            password: null,
            fromEmail: 'a@b.com',
            fromName: 'n',
          },
        });
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-smtp-null');
      const smtp = res.providers.find((p) => p.providerType === 'smtp');
      expect(smtp.apiSecret).toBe('');
    });

    it('merges SMTP when port is omitted and secure is false', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          config: {
            host: 'mail.example.com',
            secure: false,
            user: 'u',
            password: 'pw',
            fromEmail: 'a@b.com',
            fromName: 'n',
          },
        });
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-smtp-noport');
      const smtp = res.providers.find((p) => p.providerType === 'smtp');
      expect(smtp.port).toBe(587);
      expect(smtp.secure).toBe(false);
    });

    it('merges SMTP with null host as empty string', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          config: {
            host: null,
            port: 587,
            secure: false,
            user: '',
            password: 'pw',
            fromEmail: '',
            fromName: '',
          },
        });
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-smtp-nohost');
      const smtp = res.providers.find((p) => p.providerType === 'smtp');
      expect(smtp.host).toBe('');
    });

    it('merges SMTP org integration and normalizes port', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          config: {
            host: ' smtp.mail.com ',
            port: 'not-a-number',
            secure: true,
            user: ' u ',
            password: 'pw',
            fromEmail: ' from@x.com ',
            fromName: ' Name ',
          },
        });
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-smtp');
      const smtp = res.providers.find((p) => p.providerType === 'smtp');
      expect(smtp.enabled).toBe(true);
      expect(smtp.host).toBe('smtp.mail.com');
      expect(smtp.port).toBe(587);
      expect(smtp.secure).toBe(true);
      expect(smtp.apiSecret).toBe('pw');
      expect(smtp.senderEmail).toBe('from@x.com');
    });

    it('parses numeric SMTP port when valid', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          config: {
            host: 'h',
            port: 465,
            secure: 'true',
            user: '',
            password: 'smtp-pass',
            fromEmail: '',
            fromName: '',
          },
        });
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-smtp2');
      const smtp = res.providers.find((p) => p.providerType === 'smtp');
      expect(smtp.port).toBe(465);
      expect(smtp.apiSecret).toBe('smtp-pass');
    });

    it('keeps global provider when org integration has no credentials', async () => {
      mockGetOrgIntegration
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ config: { apiKey: '', senderEmail: '', senderName: '' } })
        .mockResolvedValueOnce(null);
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig('org-nocred');
      const resend = res.providers.find((p) => p.providerType === 'resend');
      expect(resend.enabled).toBe(false);
    });

    it('reuses cached Supabase client across calls', async () => {
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      await getMarketingConfig();
      await getMarketingConfig();
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
    });

    it('returns fallback global config when app_settings returns an error', async () => {
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'query failed' } }),
      }));
      jest.resetModules();
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig();
      expect(res.providers.some((p) => p.providerType === 'mailchimp')).toBe(true);
    });

    it('returns fallback when stored value is not an object', async () => {
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { value: 'bad' }, error: null }),
      }));
      jest.resetModules();
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig();
      expect(res.providers).toHaveLength(4);
    });

    it('merges global config when providers is not an array', async () => {
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { value: { defaultEmailProvider: 'resend', providers: 'invalid' } },
          error: null,
        }),
      }));
      jest.resetModules();
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig();
      expect(res.defaultEmailProvider).toBe('resend');
      expect(res.providers).toHaveLength(4);
    });

    it('returns fallback when global fetch throws', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('network');
      });
      jest.resetModules();
      const { getMarketingConfig } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfig();
      expect(res.providers).toHaveLength(4);
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

    it('masks short keys fully and long keys with a prefix plus mask', async () => {
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            value: {
              providers: [
                {
                  providerType: 'resend',
                  apiKey: 'tiny',
                  apiSecret: 'also_secret',
                  enabled: true,
                  senderEmail: '',
                  senderName: '',
                },
              ],
              defaultEmailProvider: undefined,
              defaultSmsProvider: undefined,
            },
          },
          error: null,
        }),
      }));
      jest.resetModules();
      const { getMarketingConfigForSettings } = require('@/lib/getMarketingConfig');
      const res = await getMarketingConfigForSettings();
      const resend = res.providers.find((p) => p.providerType === 'resend');
      expect(resend.apiKey).toMatch(/^•+$/);
      expect(resend.apiSecret).toContain('•');
      expect(resend.apiSecret).not.toBe('also_secret');
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

    it('uses empty string when masked apiKey and existing apiKey is missing', async () => {
      const current = {
        defaultEmailProvider: undefined,
        defaultSmsProvider: undefined,
        providers: [
          {
            providerType: 'resend',
            enabled: true,
            senderEmail: '',
            senderName: '',
          },
        ],
      };
      const incoming = {
        providers: [{ providerType: 'resend', apiKey: '••••••••••••', enabled: true }],
      };
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ upsert: mockUpsert }));
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      await saveMarketingConfig(incoming, current);
      const resend = mockUpsert.mock.calls[0][0].value.providers.find((p) => p.providerType === 'resend');
      expect(resend.apiKey).toBe('');
    });

    it('uses empty string when masked apiSecret and existing apiSecret is missing', async () => {
      const current = {
        defaultEmailProvider: undefined,
        defaultSmsProvider: undefined,
        providers: [
          {
            providerType: 'resend',
            apiKey: 'k',
            enabled: true,
            senderEmail: '',
            senderName: '',
          },
        ],
      };
      const incoming = {
        providers: [{ providerType: 'resend', apiKey: 'k', apiSecret: '••••••••••••', enabled: true }],
      };
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ upsert: mockUpsert }));
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      await saveMarketingConfig(incoming, current);
      const resend = mockUpsert.mock.calls[0][0].value.providers.find((p) => p.providerType === 'resend');
      expect(resend.apiSecret).toBe('');
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

    it('applies plain apiKey and apiSecret when not masked', async () => {
      const current = {
        defaultEmailProvider: undefined,
        defaultSmsProvider: undefined,
        providers: [
          {
            providerType: 'resend',
            apiKey: 'old_key',
            apiSecret: 'old_secret',
            enabled: true,
            senderEmail: '',
            senderName: '',
          },
        ],
      };
      const incoming = {
        providers: [
          {
            providerType: 'resend',
            apiKey: ' new_key ',
            apiSecret: ' new_secret ',
            enabled: true,
          },
        ],
      };
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ upsert: mockUpsert }));
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      const result = await saveMarketingConfig(incoming, current);
      expect(result.error).toBeUndefined();
      const saved = mockUpsert.mock.calls[0][0].value.providers.find((p) => p.providerType === 'resend');
      expect(saved.apiKey).toBe('new_key');
      expect(saved.apiSecret).toBe('new_secret');
    });

    it('returns error when upsert throws', async () => {
      mockFrom.mockImplementation(() => ({
        upsert: jest.fn().mockRejectedValue(new Error('upsert boom')),
      }));
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      const result = await saveMarketingConfig(
        { providers: [] },
        { providers: [], defaultEmailProvider: undefined, defaultSmsProvider: undefined }
      );
      expect(result.error).toBe('upsert boom');
    });

    it('returns generic error when upsert throws without message', async () => {
      mockFrom.mockImplementation(() => ({
        upsert: jest.fn().mockRejectedValue({}),
      }));
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      const result = await saveMarketingConfig(
        { providers: [] },
        { providers: [], defaultEmailProvider: undefined, defaultSmsProvider: undefined }
      );
      expect(result.error).toBe('Failed to save');
    });

    it('preserves existing apiSecret when incoming is masked', async () => {
      const current = {
        defaultEmailProvider: undefined,
        defaultSmsProvider: undefined,
        providers: [
          {
            providerType: 'resend',
            apiKey: 'k',
            apiSecret: 'keep_me',
            enabled: true,
            senderEmail: '',
            senderName: '',
          },
        ],
      };
      const incoming = {
        providers: [{ providerType: 'resend', apiKey: 'k', apiSecret: '••••••••••••', enabled: true }],
      };
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ upsert: mockUpsert }));
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      await saveMarketingConfig(incoming, current);
      const resend = mockUpsert.mock.calls[0][0].value.providers.find((p) => p.providerType === 'resend');
      expect(resend.apiSecret).toBe('keep_me');
    });

    it('leaves providers without incoming entry unchanged', async () => {
      const current = {
        defaultEmailProvider: undefined,
        defaultSmsProvider: undefined,
        providers: [
          {
            providerType: 'mailchimp',
            enabled: false,
            apiKey: 'mc_keep',
            apiSecret: '',
            senderEmail: '',
            senderName: '',
            fromNumber: '',
            smsEnabled: false,
            notes: '',
          },
          {
            providerType: 'resend',
            apiKey: 'old_re',
            apiSecret: '',
            enabled: true,
            senderEmail: '',
            senderName: '',
            notes: '',
          },
        ],
      };
      const incoming = {
        providers: [{ providerType: 'resend', apiKey: 'new_re', enabled: true }],
      };
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ upsert: mockUpsert }));
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      await saveMarketingConfig(incoming, current);
      const { providers } = mockUpsert.mock.calls[0][0].value;
      expect(providers.find((p) => p.providerType === 'mailchimp').apiKey).toBe('mc_keep');
      expect(providers.find((p) => p.providerType === 'resend').apiKey).toBe('new_re');
    });

    it('clears defaultEmailProvider and defaultSmsProvider when set to empty string', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({ upsert: mockUpsert }));
      jest.resetModules();
      const { saveMarketingConfig } = require('@/lib/getMarketingConfig');
      await saveMarketingConfig(
        { defaultEmailProvider: '', defaultSmsProvider: '' },
        { providers: [], defaultEmailProvider: 'resend', defaultSmsProvider: 'twilio' }
      );
      const { value } = mockUpsert.mock.calls[0][0];
      expect(value.defaultEmailProvider).toBeUndefined();
      expect(value.defaultSmsProvider).toBeUndefined();
    });
  });
});
