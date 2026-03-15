/**
 * Unit tests for lib/integrations/types.js: PROVIDERS and STATUSES exports.
 */
import { PROVIDERS, STATUSES } from '@/lib/integrations/types';

describe('integrations types', () => {
  it('exports PROVIDERS as frozen array of provider ids', () => {
    expect(Array.isArray(PROVIDERS)).toBe(true);
    expect(PROVIDERS).toContain('stripe');
    expect(PROVIDERS).toContain('twilio');
    expect(PROVIDERS).toContain('mailchimp');
    expect(PROVIDERS).toContain('resend');
    expect(PROVIDERS.length).toBe(4);
    expect(Object.isFrozen(PROVIDERS)).toBe(true);
  });

  it('exports STATUSES as frozen array of integration statuses', () => {
    expect(Array.isArray(STATUSES)).toBe(true);
    expect(STATUSES).toContain('connected');
    expect(STATUSES).toContain('disconnected');
    expect(STATUSES).toContain('invalid');
    expect(STATUSES).toContain('pending');
    expect(Object.isFrozen(STATUSES)).toBe(true);
  });
});
