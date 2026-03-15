/**
 * Unit tests for lib/integrations/providers/stripe.js
 */
const mockBalanceRetrieve = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    balance: { retrieve: mockBalanceRetrieve },
  }));
});

import { validateStripeConfig, stripeMetadataFromConfig } from '@/lib/integrations/providers/stripe';

describe('stripe provider', () => {
  beforeEach(() => {
    mockBalanceRetrieve.mockReset();
    mockBalanceRetrieve.mockResolvedValue(undefined);
  });

  describe('validateStripeConfig', () => {
    it('returns invalid when secretKey missing', async () => {
      const result = await validateStripeConfig({});
      expect(result).toEqual({
        ok: false,
        error: 'Valid secret key (sk_...) is required',
        status: 'invalid',
      });
    });

    it('returns invalid when secretKey does not start with sk_', async () => {
      const result = await validateStripeConfig({ secretKey: 'pk_live_xxx' });
      expect(result).toEqual({
        ok: false,
        error: 'Valid secret key (sk_...) is required',
        status: 'invalid',
      });
    });

    it('returns invalid when secretKey is whitespace', async () => {
      const result = await validateStripeConfig({ secretKey: '   ' });
      expect(result).toMatchObject({ ok: false, status: 'invalid' });
    });

    it('returns connected when balance.retrieve succeeds', async () => {
      const result = await validateStripeConfig({ secretKey: 'sk_test_xxx' });
      expect(result).toEqual({ ok: true, status: 'connected' });
      expect(mockBalanceRetrieve).toHaveBeenCalled();
    });

    it('returns invalid when balance.retrieve throws', async () => {
      mockBalanceRetrieve.mockRejectedValueOnce(new Error('Invalid API Key'));
      const result = await validateStripeConfig({ secretKey: 'sk_test_xxx' });
      expect(result).toEqual({
        ok: false,
        error: 'Invalid API Key',
        status: 'invalid',
      });
    });

    it('returns invalid with generic message when error has no message', async () => {
      mockBalanceRetrieve.mockRejectedValueOnce(new Error());
      const result = await validateStripeConfig({ secretKey: 'sk_test_xxx' });
      expect(result).toMatchObject({ ok: false, status: 'invalid' });
      expect(result.error).toBe('Stripe API error');
    });
  });

  describe('stripeMetadataFromConfig', () => {
    it('returns publishableKeySuffix as last 4 chars', () => {
      const result = stripeMetadataFromConfig({ publishableKey: 'pk_live_abcd1234' });
      expect(result).toEqual({ publishableKeySuffix: '1234' });
    });

    it('returns null when publishableKey missing', () => {
      const result = stripeMetadataFromConfig({});
      expect(result).toEqual({ publishableKeySuffix: null });
    });

    it('trims publishableKey before slicing', () => {
      const result = stripeMetadataFromConfig({ publishableKey: '  pk_xyz12  ' });
      expect(result).toEqual({ publishableKeySuffix: 'yz12' });
    });
  });
});
