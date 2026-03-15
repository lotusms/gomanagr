/**
 * Unit tests for lib/marketing/adapters/mailchimp.js
 */
import {
  validateConfig,
  getCapabilities,
  getProviderStatus,
  mapProviderError,
  sendCampaign,
  sendTestMessage,
  providerType,
  displayName,
} from '@/lib/marketing/adapters/mailchimp.js';
import { MARKETING_CHANNELS } from '@/lib/marketing/types.js';

describe('mailchimp adapter', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  it('exports providerType and displayName', () => {
    expect(providerType).toBe('mailchimp');
    expect(displayName).toBe('Mailchimp');
  });

  describe('validateConfig', () => {
    it('returns not_connected when disabled', async () => {
      const r = await validateConfig({ enabled: false });
      expect(r).toEqual({ valid: false, status: 'not_connected', message: 'Provider is disabled' });
    });

    it('returns misconfigured when apiKey missing or too short', async () => {
      expect(await validateConfig({ enabled: true })).toMatchObject({ valid: false, status: 'misconfigured' });
      expect(await validateConfig({ enabled: true, apiKey: 'short' })).toMatchObject({
        valid: false,
        message: 'Valid API key required',
      });
    });

    it('returns connected when apiKey length >= 10, message varies by SMS config', async () => {
      const r = await validateConfig({ enabled: true, apiKey: '0123456789' });
      expect(r).toEqual({ valid: true, status: 'connected', message: 'Email ready; SMS may require approval or setup' });
      const r2 = await validateConfig({ enabled: true, apiKey: '0123456789', smsEnabled: true, fromNumber: '+1' });
      expect(r2).toEqual({ valid: true, status: 'connected', message: 'Email and SMS ready' });
    });
  });

  describe('getCapabilities', () => {
    it('returns email: false, sms: false when disabled', () => {
      expect(getCapabilities({ enabled: false })).toEqual({ email: false, sms: false });
    });

    it('returns email: true when apiKey set; sms only if smsEnabled and apiKey', () => {
      expect(getCapabilities({ enabled: true, apiKey: 'x' })).toEqual({ email: true, sms: false });
      expect(getCapabilities({ enabled: true, apiKey: 'x', smsEnabled: true })).toEqual({ email: true, sms: true });
    });
  });

  describe('getProviderStatus', () => {
    it('returns status and message from validateConfig', async () => {
      const r = await getProviderStatus({ enabled: true, apiKey: '0123456789' });
      expect(r).toEqual({ status: 'connected', message: 'Email ready; SMS may require approval or setup' });
    });
  });

  describe('mapProviderError', () => {
    it('returns err.message when object with message', () => {
      expect(mapProviderError(new Error('Rate limit'))).toBe('Rate limit');
      expect(mapProviderError({ message: 'Custom' })).toBe('Custom');
    });

    it('returns default when no message', () => {
      expect(mapProviderError({})).toBe('Mailchimp request failed');
      expect(mapProviderError(null)).toBe('Mailchimp request failed');
    });
  });

  describe('sendCampaign', () => {
    it('returns invalid when config invalid', async () => {
      const r = await sendCampaign({ enabled: false }, MARKETING_CHANNELS.EMAIL, { body: 'Hi', recipients: [] });
      expect(r.success).toBe(false);
      expect(r.error).toBeDefined();
    });

    it('returns error for SMS when SMS not configured', async () => {
      const r = await sendCampaign(
        { enabled: true, apiKey: '0123456789' },
        MARKETING_CHANNELS.SMS,
        { body: 'Hi', recipients: [] }
      );
      expect(r.success).toBe(false);
      expect(r.error).toContain('SMS');
    });

    it('returns success and messageId for email', async () => {
      const p = sendCampaign(
        { enabled: true, apiKey: '0123456789' },
        MARKETING_CHANNELS.EMAIL,
        { body: 'Hi', recipients: [{ id: '1', email: 'a@b.com' }] }
      );
      await jest.advanceTimersByTimeAsync(300);
      const r = await p;
      expect(r.success).toBe(true);
      expect(r.messageId).toMatch(/^mc_/);
    });

    it('returns success for SMS when smsEnabled and apiKey', async () => {
      const p = sendCampaign(
        { enabled: true, apiKey: '0123456789', smsEnabled: true },
        MARKETING_CHANNELS.SMS,
        { body: 'Hi', recipients: [{ id: '1', phone: '+1' }] }
      );
      await jest.advanceTimersByTimeAsync(300);
      const r = await p;
      expect(r.success).toBe(true);
      expect(r.messageId).toMatch(/^mc_/);
    });
  });

  describe('sendTestMessage', () => {
    it('returns error for SMS when SMS not configured', async () => {
      const r = await sendTestMessage(
        { enabled: true, apiKey: '0123456789' },
        { channel: 'sms', body: 'Hi', to: '+1' }
      );
      expect(r.success).toBe(false);
      expect(r.error).toContain('SMS');
    });

    it('returns success for email', async () => {
      const p = sendTestMessage(
        { enabled: true, apiKey: '0123456789' },
        { channel: 'email', body: 'Hi', to: 'a@b.com', subject: 'Test' }
      );
      await jest.advanceTimersByTimeAsync(200);
      const r = await p;
      expect(r.success).toBe(true);
      expect(r.messageId).toMatch(/^test_/);
    });
  });
});
