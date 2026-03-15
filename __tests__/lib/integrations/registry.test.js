/**
 * Unit tests for lib/integrations/registry.js:
 * listProviders, getProviderMeta, maskSecret, PROVIDER_META, MASK.
 */

describe('integrations registry', () => {
  let registry;

  beforeAll(() => {
    registry = require('@/lib/integrations/registry');
  });

  describe('exports', () => {
    it('exports PROVIDER_META with stripe, twilio, mailchimp, resend', () => {
      expect(registry.PROVIDER_META).toBeDefined();
      expect(registry.PROVIDER_META.stripe).toBeDefined();
      expect(registry.PROVIDER_META.stripe.name).toBe('Stripe');
      expect(registry.PROVIDER_META.twilio.name).toBe('Twilio');
      expect(registry.PROVIDER_META.mailchimp.name).toBe('Mailchimp');
      expect(registry.PROVIDER_META.resend.name).toBe('Resend');
    });

    it('exports MASK string', () => {
      expect(registry.MASK).toBe('••••••••••••');
    });
  });

  describe('listProviders', () => {
    it('returns array of provider ids and meta', () => {
      const list = registry.listProviders();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(4);
      const ids = list.map((p) => p.provider);
      expect(ids).toContain('stripe');
      expect(ids).toContain('twilio');
      expect(ids).toContain('mailchimp');
      expect(ids).toContain('resend');
      list.forEach((p) => {
        expect(p).toHaveProperty('provider');
        expect(p).toHaveProperty('name');
        expect(p).toHaveProperty('description');
      });
    });
  });

  describe('getProviderMeta', () => {
    it('returns meta for stripe', () => {
      const meta = registry.getProviderMeta('stripe');
      expect(meta).toBeDefined();
      expect(meta.name).toBe('Stripe');
      expect(Array.isArray(meta.fields)).toBe(true);
      const keys = meta.fields.map((f) => f.key);
      expect(keys).toContain('publishableKey');
      expect(keys).toContain('secretKey');
    });

    it('returns meta for twilio, mailchimp, resend', () => {
      ['twilio', 'mailchimp', 'resend'].forEach((id) => {
        const meta = registry.getProviderMeta(id);
        expect(meta).toBeDefined();
        expect(meta.name).toBeDefined();
        expect(Array.isArray(meta.fields)).toBe(true);
      });
    });

    it('returns null for unknown provider', () => {
      expect(registry.getProviderMeta('unknown')).toBeNull();
    });
  });

  describe('maskSecret', () => {
    it('masks short strings with fixed mask', () => {
      const masked = registry.maskSecret('ab');
      expect(masked).toBe(registry.MASK);
    });

    it('uses custom prefixLen when provided', () => {
      const masked = registry.maskSecret('sk_live_abc123', 8);
      expect(masked).toMatch(/^sk_live_/);
      expect(masked).toContain(registry.MASK);
    });

    it('shows prefix then mask for long strings (default prefixLen 7)', () => {
      const masked = registry.maskSecret('sk_live_abcdefgh1234');
      expect(masked).toMatch(/^sk_live/);
      expect(masked).not.toContain('abcdefgh');
    });

    it('handles empty or null', () => {
      expect(registry.maskSecret('')).toBeNull();
      expect(registry.maskSecret(null)).toBeNull();
    });
  });
});
