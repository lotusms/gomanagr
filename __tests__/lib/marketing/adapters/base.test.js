/**
 * Unit tests for lib/marketing/adapters/base.js
 */
import { validationResult, sendResult, PROVIDER_TYPES, MARKETING_CHANNELS } from '@/lib/marketing/adapters/base.js';

describe('marketing adapters base', () => {
  describe('validationResult', () => {
    it('returns valid: true with optional status and message', () => {
      expect(validationResult(true)).toEqual({ valid: true });
      expect(validationResult(true, 'connected')).toEqual({ valid: true, status: 'connected' });
      expect(validationResult(true, 'connected', 'Email ready')).toEqual({
        valid: true,
        status: 'connected',
        message: 'Email ready',
      });
    });

    it('returns valid: false with optional status and message', () => {
      expect(validationResult(false, 'misconfigured', 'API key required')).toEqual({
        valid: false,
        status: 'misconfigured',
        message: 'API key required',
      });
    });

    it('omits status when falsy', () => {
      expect(validationResult(false, '', 'msg')).toEqual({ valid: false, message: 'msg' });
    });

    it('omits message when falsy', () => {
      expect(validationResult(false, 'not_connected')).toEqual({ valid: false, status: 'not_connected' });
    });
  });

  describe('sendResult', () => {
    it('returns success with optional messageId, error, providerErrorCode', () => {
      expect(sendResult(true)).toEqual({ success: true });
      expect(sendResult(true, 'msg_123')).toEqual({ success: true, messageId: 'msg_123' });
      expect(sendResult(false, undefined, 'API error')).toEqual({ success: false, error: 'API error' });
      expect(sendResult(false, undefined, 'err', 'RATE_LIMIT')).toEqual({
        success: false,
        error: 'err',
        providerErrorCode: 'RATE_LIMIT',
      });
    });
  });

  describe('re-exports', () => {
    it('exports PROVIDER_TYPES with mailchimp, twilio, ses, resend', () => {
      expect(PROVIDER_TYPES.MAILCHIMP).toBe('mailchimp');
      expect(PROVIDER_TYPES.TWILIO).toBe('twilio');
      expect(PROVIDER_TYPES.SES).toBe('ses');
      expect(PROVIDER_TYPES.RESEND).toBe('resend');
    });

    it('exports MARKETING_CHANNELS with SMS and EMAIL', () => {
      expect(MARKETING_CHANNELS.SMS).toBe('sms');
      expect(MARKETING_CHANNELS.EMAIL).toBe('email');
    });
  });
});
