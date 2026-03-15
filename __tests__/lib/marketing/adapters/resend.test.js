/**
 * Unit tests for lib/marketing/adapters/resend.js
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
} from '@/lib/marketing/adapters/resend.js';
import { MARKETING_CHANNELS } from '@/lib/marketing/types.js';

describe('resend adapter', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  it('exports providerType and displayName', () => {
    expect(providerType).toBe('resend');
    expect(displayName).toBe('Resend');
  });

  describe('validateConfig', () => {
    it('returns not_connected when disabled', async () => {
      const r = await validateConfig({ enabled: false });
      expect(r).toEqual({ valid: false, status: 'not_connected', message: 'Provider is disabled' });
    });

    it('returns misconfigured when apiKey missing or too short', async () => {
      expect(await validateConfig({ enabled: true, senderEmail: 'a@b.com' })).toMatchObject({
        valid: false,
        message: 'API key required',
      });
      expect(await validateConfig({ enabled: true, apiKey: 'short' })).toMatchObject({ valid: false });
    });

    it('returns misconfigured when senderEmail missing', async () => {
      const r = await validateConfig({ enabled: true, apiKey: '0123456789' });
      expect(r).toEqual({ valid: false, status: 'misconfigured', message: 'Sender email required' });
    });

    it('returns connected when apiKey and senderEmail set', async () => {
      const r = await validateConfig({ enabled: true, apiKey: '0123456789', senderEmail: 'a@b.com' });
      expect(r).toEqual({ valid: true, status: 'connected', message: 'Email ready' });
    });
  });

  describe('getCapabilities', () => {
    it('returns email: false, sms: false when disabled', () => {
      expect(getCapabilities({ enabled: false })).toEqual({ email: false, sms: false });
    });

    it('returns email: true only when apiKey and senderEmail', () => {
      expect(getCapabilities({ enabled: true, apiKey: 'x' })).toEqual({ email: false, sms: false });
      expect(getCapabilities({ enabled: true, apiKey: 'x', senderEmail: 'a@b.com' })).toEqual({ email: true, sms: false });
    });
  });

  describe('getProviderStatus', () => {
    it('returns status and message from validateConfig', async () => {
      const r = await getProviderStatus({ enabled: true, apiKey: '0123456789', senderEmail: 'a@b.com' });
      expect(r).toEqual({ status: 'connected', message: 'Email ready' });
    });
  });

  describe('mapProviderError', () => {
    it('returns err.message when object with message', () => {
      expect(mapProviderError(new Error('Rate limit'))).toBe('Rate limit');
    });

    it('returns default when no message', () => {
      expect(mapProviderError(null)).toBe('Resend request failed');
    });
  });

  describe('sendCampaign', () => {
    it('returns error for SMS (email only)', async () => {
      const r = await sendCampaign(
        { enabled: true, apiKey: '0123456789', senderEmail: 'a@b.com' },
        MARKETING_CHANNELS.SMS,
        { body: 'Hi', recipients: [] }
      );
      expect(r.success).toBe(false);
      expect(r.error).toContain('email only');
    });

    it('returns invalid when config invalid', async () => {
      const r = await sendCampaign({ enabled: false }, MARKETING_CHANNELS.EMAIL, { body: 'Hi', recipients: [] });
      expect(r.success).toBe(false);
    });

    it('returns success and messageId for email', async () => {
      const p = sendCampaign(
        { enabled: true, apiKey: '0123456789', senderEmail: 'a@b.com' },
        MARKETING_CHANNELS.EMAIL,
        { subject: 'Hi', body: 'Body', recipients: [{ id: '1', email: 'a@b.com' }] }
      );
      await jest.advanceTimersByTimeAsync(300);
      const r = await p;
      expect(r.success).toBe(true);
      expect(r.messageId).toMatch(/^re_/);
    });
  });

  describe('sendTestMessage', () => {
    it('returns error for SMS channel', async () => {
      const r = await sendTestMessage(
        { enabled: true, apiKey: '0123456789', senderEmail: 'a@b.com' },
        { channel: 'sms', body: 'Hi', to: '+1' }
      );
      expect(r.success).toBe(false);
      expect(r.error).toContain('email only');
    });

    it('returns success for email', async () => {
      const p = sendTestMessage(
        { enabled: true, apiKey: '0123456789', senderEmail: 'a@b.com' },
        { channel: 'email', body: 'Hi', to: 'a@b.com', subject: 'Test' }
      );
      await jest.advanceTimersByTimeAsync(200);
      const r = await p;
      expect(r.success).toBe(true);
      expect(r.messageId).toMatch(/^test_re_/);
    });
  });
});
