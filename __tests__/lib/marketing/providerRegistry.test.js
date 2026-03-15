/**
 * Unit tests for lib/marketing/providerRegistry.js
 */
const mockGetMarketingSettings = jest.fn();

jest.mock('@/lib/marketing/marketingSettingsService.js', () => ({
  getMarketingSettings: (...args) => mockGetMarketingSettings(...args),
}));

import {
  getActiveProviderForChannel,
  validateProviderConfig,
  getProviderCapabilities,
  getProviderStatus,
  sendCampaign,
  sendTestMessage,
  PROVIDER_DISPLAY_NAMES,
} from '@/lib/marketing/providerRegistry.js';

import { PROVIDER_TYPES } from '@/lib/marketing/types.js';

describe('providerRegistry', () => {
  beforeEach(() => {
    mockGetMarketingSettings.mockReset();
  });

  describe('PROVIDER_DISPLAY_NAMES', () => {
    it('exports display names for mailchimp, twilio, resend, ses', () => {
      expect(PROVIDER_DISPLAY_NAMES[PROVIDER_TYPES.MAILCHIMP]).toBe('Mailchimp');
      expect(PROVIDER_DISPLAY_NAMES[PROVIDER_TYPES.TWILIO]).toBe('Twilio');
      expect(PROVIDER_DISPLAY_NAMES[PROVIDER_TYPES.RESEND]).toBe('Resend');
      expect(PROVIDER_DISPLAY_NAMES[PROVIDER_TYPES.SES]).toBe('Amazon SES');
    });
  });

  describe('getActiveProviderForChannel', () => {
    it('returns null when no default provider for channel', async () => {
      mockGetMarketingSettings.mockResolvedValue({
        defaultEmailProvider: undefined,
        defaultSmsProvider: undefined,
        providers: [],
      });
      const emailActive = await getActiveProviderForChannel('email');
      const smsActive = await getActiveProviderForChannel('sms');
      expect(emailActive).toBeNull();
      expect(smsActive).toBeNull();
    });

    it('returns null when default provider not enabled', async () => {
      mockGetMarketingSettings.mockResolvedValue({
        defaultEmailProvider: 'resend',
        defaultSmsProvider: undefined,
        providers: [{ providerType: 'resend', enabled: false, apiKey: '' }],
      });
      const active = await getActiveProviderForChannel('email');
      expect(active).toBeNull();
    });

    it('returns null for unknown provider type', async () => {
      mockGetMarketingSettings.mockResolvedValue({
        defaultEmailProvider: 'unknown_type',
        defaultSmsProvider: undefined,
        providers: [{ providerType: 'unknown_type', enabled: true }],
      });
      const active = await getActiveProviderForChannel('email');
      expect(active).toBeNull();
    });

    it('returns provider and adapter when resend is default and enabled', async () => {
      mockGetMarketingSettings.mockResolvedValue({
        defaultEmailProvider: 'resend',
        defaultSmsProvider: undefined,
        providers: [{ providerType: 'resend', enabled: true, apiKey: 're_1234567890', senderEmail: 'a@b.com' }],
      });
      const active = await getActiveProviderForChannel('email');
      expect(active).not.toBeNull();
      expect(active.provider.providerType).toBe('resend');
      expect(active.adapter).toBeDefined();
      expect(typeof active.adapter.getCapabilities).toBe('function');
    });

    it('returns null for email when default is SMS-only (twilio)', async () => {
      mockGetMarketingSettings.mockResolvedValue({
        defaultEmailProvider: undefined,
        defaultSmsProvider: 'twilio',
        providers: [{ providerType: 'twilio', enabled: true, fromNumber: '+1', apiKey: 'ACx', apiSecret: 't' }],
      });
      const emailActive = await getActiveProviderForChannel('email');
      const smsActive = await getActiveProviderForChannel('sms');
      expect(emailActive).toBeNull();
      expect(smsActive).not.toBeNull();
    });
  });

  describe('validateProviderConfig', () => {
    it('returns invalid for unknown provider type', async () => {
      const result = await validateProviderConfig({ providerType: 'unknown', enabled: true });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Unknown');
    });

    it('returns adapter validation result for resend', async () => {
      const result = await validateProviderConfig({
        providerType: 'resend',
        enabled: true,
        apiKey: 're_1234567890',
        senderEmail: 'a@b.com',
      });
      expect(result.valid).toBe(true);
      expect(result.status).toBe('connected');
    });
  });

  describe('getProviderCapabilities', () => {
    it('returns email: false, sms: false for unknown provider', () => {
      const caps = getProviderCapabilities({ providerType: 'unknown' });
      expect(caps).toEqual({ email: false, sms: false });
    });

    it('returns capabilities for resend config', () => {
      const caps = getProviderCapabilities({ providerType: 'resend', enabled: true, apiKey: 're_xxx', senderEmail: 'a@b.com' });
      expect(caps.email).toBe(true);
      expect(caps.sms).toBe(false);
    });
  });

  describe('getProviderStatus', () => {
    it('returns not_connected for unknown provider', async () => {
      const result = await getProviderStatus({ providerType: 'unknown' });
      expect(result.status).toBe('not_connected');
      expect(result.message).toContain('Unknown');
    });

    it('returns status from adapter for resend', async () => {
      const result = await getProviderStatus({
        providerType: 'resend',
        enabled: true,
        apiKey: 're_1234567890',
        senderEmail: 'a@b.com',
      });
      expect(result.status).toBe('connected');
      expect(result.message).toBe('Email ready');
    });
  });

  describe('sendCampaign', () => {
    it('returns error when no active provider for email', async () => {
      mockGetMarketingSettings.mockResolvedValue({
        defaultEmailProvider: undefined,
        defaultSmsProvider: undefined,
        providers: [],
      });
      const result = await sendCampaign('email', { body: 'Hi', recipients: [] });
      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('returns error when no active provider for sms', async () => {
      mockGetMarketingSettings.mockResolvedValue({
        defaultEmailProvider: undefined,
        defaultSmsProvider: undefined,
        providers: [],
      });
      const result = await sendCampaign('sms', { body: 'Hi', recipients: [] });
      expect(result.success).toBe(false);
      expect(result.error).toContain('SMS');
    });

    it('calls adapter sendCampaign when active provider exists', async () => {
      mockGetMarketingSettings.mockResolvedValue({
        defaultEmailProvider: 'resend',
        defaultSmsProvider: undefined,
        providers: [{ providerType: 'resend', enabled: true, apiKey: 're_1234567890', senderEmail: 'a@b.com' }],
      });
      const result = await sendCampaign('email', {
        subject: 'Test',
        body: 'Body',
        recipients: [{ id: '1', email: 'a@b.com' }],
      });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('messageId');
      expect(result.success).toBe(true);
    });
  });

  describe('sendTestMessage', () => {
    it('returns error when no active provider', async () => {
      mockGetMarketingSettings.mockResolvedValue({
        defaultEmailProvider: undefined,
        defaultSmsProvider: undefined,
        providers: [],
      });
      const result = await sendTestMessage('email', { channel: 'email', body: 'Hi', to: 'a@b.com' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('provider');
    });

    it('calls adapter sendTestMessage when active provider exists', async () => {
      mockGetMarketingSettings.mockResolvedValue({
        defaultEmailProvider: 'resend',
        defaultSmsProvider: undefined,
        providers: [{ providerType: 'resend', enabled: true, apiKey: 're_1234567890', senderEmail: 'a@b.com' }],
      });
      const result = await sendTestMessage('email', {
        channel: 'email',
        body: 'Test body',
        to: 'a@b.com',
        subject: 'Test',
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });
});
