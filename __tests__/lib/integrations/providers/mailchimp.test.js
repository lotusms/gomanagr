/**
 * Unit tests for lib/integrations/providers/mailchimp.js
 */
import { validateMailchimpConfig, mailchimpMetadataFromConfig } from '@/lib/integrations/providers/mailchimp';

describe('mailchimp provider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('validateMailchimpConfig', () => {
    it('returns invalid when apiKey missing', async () => {
      const result = await validateMailchimpConfig({ serverPrefix: 'us21' });
      expect(result).toEqual({ ok: false, error: 'API key is required', status: 'invalid' });
    });

    it('returns invalid when apiKey empty or whitespace', async () => {
      expect(await validateMailchimpConfig({ apiKey: '', serverPrefix: 'us21' })).toMatchObject({
        ok: false,
        error: 'API key is required',
        status: 'invalid',
      });
      expect(await validateMailchimpConfig({ apiKey: '  ', serverPrefix: 'us21' })).toMatchObject({
        ok: false,
        error: 'API key is required',
        status: 'invalid',
      });
    });

    it('returns invalid when serverPrefix missing', async () => {
      const result = await validateMailchimpConfig({ apiKey: 'key123' });
      expect(result).toEqual({ ok: false, error: 'Server prefix (e.g. us21) is required', status: 'invalid' });
    });

    it('returns connected when ping succeeds', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      const result = await validateMailchimpConfig({ apiKey: 'key', serverPrefix: 'us21' });
      expect(result).toEqual({ ok: true, status: 'connected' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://us21.api.mailchimp.com/3.0/ping',
        expect.objectContaining({ headers: { Authorization: 'Bearer key' } })
      );
    });

    it('returns invalid when ping fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: () => Promise.resolve('Unauthorized') });
      const result = await validateMailchimpConfig({ apiKey: 'bad', serverPrefix: 'us21' });
      expect(result).toEqual({ ok: false, error: 'Unauthorized', status: 'invalid' });
    });

    it('returns invalid when fetch throws', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await validateMailchimpConfig({ apiKey: 'key', serverPrefix: 'us21' });
      expect(result).toMatchObject({ ok: false, status: 'invalid' });
      expect(result.error).toContain('Network error');
    });

    it('normalizes serverPrefix to lowercase in URL', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      await validateMailchimpConfig({ apiKey: 'k', serverPrefix: 'US21' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://us21.api.mailchimp.com/3.0/ping',
        expect.any(Object)
      );
    });
  });

  describe('mailchimpMetadataFromConfig', () => {
    it('returns trimmed senderEmail, senderName, serverPrefix', () => {
      const result = mailchimpMetadataFromConfig({
        senderEmail: '  a@b.com  ',
        senderName: '  Acme  ',
        serverPrefix: '  us21  ',
      });
      expect(result).toEqual({
        senderEmail: 'a@b.com',
        senderName: 'Acme',
        serverPrefix: 'us21',
      });
    });

    it('returns null for missing or empty fields', () => {
      const result = mailchimpMetadataFromConfig({});
      expect(result).toEqual({
        senderEmail: null,
        senderName: null,
        serverPrefix: null,
      });
    });
  });
});
