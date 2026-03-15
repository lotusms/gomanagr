/**
 * Unit tests for lib/marketing/adapters/twilio.js
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
} from '@/lib/marketing/adapters/twilio.js';
import { MARKETING_CHANNELS } from '@/lib/marketing/types.js';

describe('twilio adapter', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  it('exports providerType and displayName', () => {
    expect(providerType).toBe('twilio');
    expect(displayName).toBe('Twilio');
  });

  describe('validateConfig', () => {
    it('returns not_connected when disabled', async () => {
      const r = await validateConfig({ enabled: false });
      expect(r).toEqual({ valid: false, status: 'not_connected', message: 'Provider is disabled' });
    });

    it('returns misconfigured when apiKey or apiSecret missing', async () => {
      expect(await validateConfig({ enabled: true, fromNumber: '+1' })).toMatchObject({
        valid: false,
        message: 'Account SID and Auth Token required',
      });
      expect(await validateConfig({ enabled: true, apiKey: 'ACx', fromNumber: '+1' })).toMatchObject({ valid: false });
    });

    it('returns misconfigured when fromNumber missing', async () => {
      const r = await validateConfig({ enabled: true, apiKey: 'ACx', apiSecret: 'token' });
      expect(r).toEqual({ valid: false, status: 'misconfigured', message: 'From number required for SMS' });
    });

    it('returns connected when apiKey, apiSecret, fromNumber set', async () => {
      const r = await validateConfig({
        enabled: true,
        apiKey: 'ACx',
        apiSecret: 'token',
        fromNumber: '+15551234567',
      });
      expect(r).toEqual({ valid: true, status: 'connected', message: 'SMS ready' });
    });
  });

  describe('getCapabilities', () => {
    it('returns email: false, sms: false when disabled', () => {
      expect(getCapabilities({ enabled: false })).toEqual({ email: false, sms: false });
    });

    it('returns sms: true only when apiKey, apiSecret, fromNumber', () => {
      expect(getCapabilities({ enabled: true, apiKey: 'ACx' })).toEqual({ email: false, sms: false });
      expect(
        getCapabilities({ enabled: true, apiKey: 'ACx', apiSecret: 't', fromNumber: '+1' })
      ).toEqual({ email: false, sms: true });
    });
  });

  describe('getProviderStatus', () => {
    it('returns status and message from validateConfig', async () => {
      const r = await getProviderStatus({
        enabled: true,
        apiKey: 'ACx',
        apiSecret: 't',
        fromNumber: '+1',
      });
      expect(r).toEqual({ status: 'connected', message: 'SMS ready' });
    });
  });

  describe('mapProviderError', () => {
    it('returns err.message when object with message', () => {
      expect(mapProviderError(new Error('Network'))).toBe('Network');
    });

    it('returns default when no message', () => {
      expect(mapProviderError(null)).toBe('Twilio request failed');
    });
  });

  describe('sendCampaign', () => {
    it('returns error for email (SMS only)', async () => {
      const r = await sendCampaign(
        { enabled: true, apiKey: 'ACx', apiSecret: 't', fromNumber: '+1' },
        MARKETING_CHANNELS.EMAIL,
        { body: 'Hi', recipients: [] }
      );
      expect(r.success).toBe(false);
      expect(r.error).toContain('SMS only');
    });

    it('returns invalid when config invalid', async () => {
      const r = await sendCampaign({ enabled: false }, MARKETING_CHANNELS.SMS, { body: 'Hi', recipients: [] });
      expect(r.success).toBe(false);
    });

    it('returns success and messageId for SMS', async () => {
      const p = sendCampaign(
        { enabled: true, apiKey: 'ACx', apiSecret: 't', fromNumber: '+1' },
        MARKETING_CHANNELS.SMS,
        { body: 'Hi', recipients: [{ id: '1', phone: '+15551234567' }] }
      );
      await jest.advanceTimersByTimeAsync(300);
      const r = await p;
      expect(r.success).toBe(true);
      expect(r.messageId).toMatch(/^tw_/);
    });
  });

  describe('sendTestMessage', () => {
    it('returns error for email channel', async () => {
      const r = await sendTestMessage(
        { enabled: true, apiKey: 'ACx', apiSecret: 't', fromNumber: '+1' },
        { channel: 'email', body: 'Hi', to: 'a@b.com' }
      );
      expect(r.success).toBe(false);
      expect(r.error).toContain('SMS only');
    });

    it('returns success for SMS', async () => {
      const p = sendTestMessage(
        { enabled: true, apiKey: 'ACx', apiSecret: 't', fromNumber: '+1' },
        { channel: 'sms', body: 'Hi', to: '+15551234567' }
      );
      await jest.advanceTimersByTimeAsync(200);
      const r = await p;
      expect(r.success).toBe(true);
      expect(r.messageId).toMatch(/^test_tw_/);
    });
  });
});
