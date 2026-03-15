/**
 * Unit tests for lib/integrations/providers/twilio.js
 * Twilio is optional; Jest resolves it via moduleNameMapper to a local mock.
 */
import { __setMockFetch } from 'twilio';
import { validateTwilioConfig, twilioMetadataFromConfig } from '@/lib/integrations/providers/twilio';

describe('twilio provider', () => {
  const mockAccountsFetch = jest.fn().mockResolvedValue({});
  const validConfig = {
    accountSid: 'AC1234567890abcdef',
    authToken: 'token',
    fromNumber: '+15551234567',
  };

  beforeAll(() => {
    __setMockFetch(mockAccountsFetch);
  });

  beforeEach(() => {
    mockAccountsFetch.mockClear();
    mockAccountsFetch.mockResolvedValue({});
  });

  describe('validateTwilioConfig', () => {
    it('returns invalid when accountSid missing', async () => {
      const result = await validateTwilioConfig({
        authToken: 't',
        fromNumber: '+1',
      });
      expect(result).toEqual({
        ok: false,
        error: 'Valid Account SID (AC...) is required',
        status: 'invalid',
      });
    });

    it('returns invalid when accountSid does not start with AC', async () => {
      const result = await validateTwilioConfig({
        accountSid: 'CAxxx',
        authToken: 't',
        fromNumber: '+1',
      });
      expect(result).toEqual({
        ok: false,
        error: 'Valid Account SID (AC...) is required',
        status: 'invalid',
      });
    });

    it('returns invalid when authToken missing', async () => {
      const result = await validateTwilioConfig({
        accountSid: 'AC123',
        fromNumber: '+1',
      });
      expect(result).toEqual({
        ok: false,
        error: 'Auth Token is required',
        status: 'invalid',
      });
    });

    it('returns invalid when fromNumber missing', async () => {
      const result = await validateTwilioConfig({
        accountSid: 'AC123',
        authToken: 't',
      });
      expect(result).toEqual({
        ok: false,
        error: 'From phone number is required',
        status: 'invalid',
      });
    });

    it('returns connected when client.api.accounts().fetch() succeeds', async () => {
      const result = await validateTwilioConfig(validConfig);
      expect(result).toEqual({ ok: true, status: 'connected' });
      expect(mockAccountsFetch).toHaveBeenCalledWith('AC1234567890abcdef');
    });

    it('returns invalid when fetch throws', async () => {
      mockAccountsFetch.mockRejectedValueOnce(new Error('Network error'));
      const result = await validateTwilioConfig(validConfig);
      expect(result).toMatchObject({ ok: false, status: 'invalid' });
      expect(result.error).toContain('Network error');
    });
  });

  describe('twilioMetadataFromConfig', () => {
    it('returns trimmed fromNumber and accountSidSuffix (last 4)', () => {
      const result = twilioMetadataFromConfig({
        fromNumber: '  +15551234567  ',
        accountSid: 'AC1234567890abcdef',
      });
      expect(result).toEqual({
        fromNumber: '+15551234567',
        accountSidSuffix: 'cdef',
      });
    });

    it('returns null for missing fields', () => {
      const result = twilioMetadataFromConfig({});
      expect(result).toEqual({ fromNumber: null, accountSidSuffix: null });
    });
  });
});
