/**
 * Unit tests for lib/marketing/adapters/index.js (exports).
 */
import * as adapters from '@/lib/marketing/adapters/index.js';

describe('marketing adapters index', () => {
  it('re-exports base (validationResult, sendResult, PROVIDER_TYPES, MARKETING_CHANNELS)', () => {
    expect(adapters.validationResult).toBeDefined();
    expect(adapters.sendResult).toBeDefined();
    expect(adapters.PROVIDER_TYPES).toBeDefined();
    expect(adapters.MARKETING_CHANNELS).toBeDefined();
  });

  it('exports mailchimp namespace with validateConfig, getCapabilities, sendCampaign, sendTestMessage, mapProviderError, getProviderStatus', () => {
    expect(adapters.mailchimp).toBeDefined();
    expect(typeof adapters.mailchimp.validateConfig).toBe('function');
    expect(typeof adapters.mailchimp.getCapabilities).toBe('function');
    expect(typeof adapters.mailchimp.sendCampaign).toBe('function');
    expect(typeof adapters.mailchimp.sendTestMessage).toBe('function');
    expect(typeof adapters.mailchimp.mapProviderError).toBe('function');
    expect(typeof adapters.mailchimp.getProviderStatus).toBe('function');
    expect(adapters.mailchimp.providerType).toBe('mailchimp');
    expect(adapters.mailchimp.displayName).toBe('Mailchimp');
  });

  it('exports twilio namespace with same adapter shape', () => {
    expect(adapters.twilio).toBeDefined();
    expect(typeof adapters.twilio.validateConfig).toBe('function');
    expect(typeof adapters.twilio.getCapabilities).toBe('function');
    expect(adapters.twilio.providerType).toBe('twilio');
    expect(adapters.twilio.displayName).toBe('Twilio');
  });

  it('exports resend namespace with same adapter shape', () => {
    expect(adapters.resend).toBeDefined();
    expect(typeof adapters.resend.validateConfig).toBe('function');
    expect(adapters.resend.providerType).toBe('resend');
    expect(adapters.resend.displayName).toBe('Resend');
  });
});
