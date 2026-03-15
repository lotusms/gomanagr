/**
 * Unit tests for lib/marketing/marketingSettingsService.js
 */
const STORAGE_KEY = 'gomanagr_marketing_settings';
let storage = {};
const originalFetch = global.fetch;

describe('marketingSettingsService', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'window', {
      value: {
        localStorage: {
          getItem: (key) => storage[key] ?? null,
          setItem: (key, val) => { storage[key] = val; },
        },
      },
      writable: true,
    });
  });

  afterAll(() => {
    delete global.window;
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    storage = {};
    global.fetch = originalFetch;
  });

  describe('getMarketingSettings', () => {
    it('returns default providers from localStorage when no userId and storage empty', async () => {
      const { getMarketingSettings } = await import('@/lib/marketing/marketingSettingsService.js');
      const settings = await getMarketingSettings();
      expect(settings.providers).toBeDefined();
      expect(Array.isArray(settings.providers)).toBe(true);
      expect(settings.providers.length).toBeGreaterThanOrEqual(3);
      const types = settings.providers.map((p) => p.providerType);
      expect(types).toContain('mailchimp');
      expect(types).toContain('twilio');
      expect(types).toContain('resend');
      expect(settings.defaultEmailProvider).toBeUndefined();
      expect(settings.defaultSmsProvider).toBeUndefined();
    });

    it('returns merged settings when localStorage has saved data', async () => {
      const saved = {
        defaultEmailProvider: 'resend',
        defaultSmsProvider: 'twilio',
        providers: [
          { providerType: 'resend', enabled: true, apiKey: 're_xxx', senderEmail: 'a@b.com', senderName: 'Acme', notes: 'Resend' },
        ],
      };
      storage[STORAGE_KEY] = JSON.stringify(saved);
      const { getMarketingSettings } = await import('@/lib/marketing/marketingSettingsService.js');
      const settings = await getMarketingSettings();
      expect(settings.defaultEmailProvider).toBe('resend');
      expect(settings.defaultSmsProvider).toBe('twilio');
      const resend = settings.providers.find((p) => p.providerType === 'resend');
      expect(resend).toBeDefined();
      expect(resend.enabled).toBe(true);
      expect(resend.apiKey).toBe('re_xxx');
    });

    it('when userId provided and API returns ok, merges and caches then returns settings', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            defaultEmailProvider: 'mailchimp',
            defaultSmsProvider: 'twilio',
            providers: [{ providerType: 'mailchimp', enabled: true, apiKey: 'mc_xxx' }],
          }),
      });
      const { getMarketingSettings } = await import('@/lib/marketing/marketingSettingsService.js');
      const settings = await getMarketingSettings('user-123');
      expect(settings.defaultEmailProvider).toBe('mailchimp');
      expect(settings.defaultSmsProvider).toBe('twilio');
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/settings/marketing-providers?'));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\?userId=user-123/));
    });

    it('when userId provided but API not ok, falls back to localStorage', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      storage[STORAGE_KEY] = JSON.stringify({ defaultEmailProvider: 'resend', defaultSmsProvider: undefined, providers: [] });
      const { getMarketingSettings } = await import('@/lib/marketing/marketingSettingsService.js');
      const settings = await getMarketingSettings('user-123');
      expect(settings.defaultEmailProvider).toBe('resend');
    });

    it('when userId empty or not string, uses localStorage', async () => {
      storage[STORAGE_KEY] = JSON.stringify({ defaultEmailProvider: 'resend', defaultSmsProvider: undefined, providers: [] });
      const { getMarketingSettings } = await import('@/lib/marketing/marketingSettingsService.js');
      await expect(getMarketingSettings('')).resolves.toBeDefined();
      await expect(getMarketingSettings(null)).resolves.toBeDefined();
    });
  });

  describe('saveMarketingSettings', () => {
    it('saves to localStorage when no userId', async () => {
      const { saveMarketingSettings, getMarketingSettings } = await import('@/lib/marketing/marketingSettingsService.js');
      const settings = {
        defaultEmailProvider: 'resend',
        defaultSmsProvider: 'twilio',
        providers: [{ providerType: 'resend', enabled: true, apiKey: 're_xxx' }],
      };
      await saveMarketingSettings(settings);
      const stored = storage[STORAGE_KEY];
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored);
      expect(parsed.defaultEmailProvider).toBe('resend');
      expect(parsed.providers).toHaveLength(1);
    });

    it('when userId provided, POSTs to API and throws on !res.ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });
      const { saveMarketingSettings } = await import('@/lib/marketing/marketingSettingsService.js');
      const settings = {
        defaultEmailProvider: 'resend',
        defaultSmsProvider: undefined,
        providers: [],
      };
      await expect(saveMarketingSettings(settings, 'user-1')).rejects.toThrow('Server error');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings/marketing-providers',
        expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json' } })
      );
    });

    it('when userId provided and API ok, resolves without caching full config', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      const { saveMarketingSettings } = await import('@/lib/marketing/marketingSettingsService.js');
      const settings = {
        defaultEmailProvider: 'resend',
        defaultSmsProvider: undefined,
        providers: [{ providerType: 'resend', enabled: true }],
      };
      await expect(saveMarketingSettings(settings, 'user-1')).resolves.toBeUndefined();
    });
  });
});
