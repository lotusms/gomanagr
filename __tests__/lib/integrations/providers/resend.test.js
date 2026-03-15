/**
 * Unit tests for lib/integrations/providers/resend.js
 */
const mockDomainsList = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    domains: { list: mockDomainsList },
  })),
}));

import { validateResendConfig, resendMetadataFromConfig } from '@/lib/integrations/providers/resend';

describe('resend provider', () => {
  beforeEach(() => {
    mockDomainsList.mockReset();
    mockDomainsList.mockResolvedValue({ data: [], error: null });
  });

  describe('validateResendConfig', () => {
    it('returns invalid when apiKey missing', async () => {
      const result = await validateResendConfig({});
      expect(result).toEqual({ ok: false, error: 'API key is required', status: 'invalid' });
    });

    it('returns invalid when apiKey empty', async () => {
      const result = await validateResendConfig({ apiKey: '   ' });
      expect(result).toEqual({ ok: false, error: 'API key is required', status: 'invalid' });
    });

    it('returns connected when domains.list succeeds', async () => {
      const result = await validateResendConfig({ apiKey: 're_xxx' });
      expect(result).toEqual({ ok: true, status: 'connected' });
      expect(mockDomainsList).toHaveBeenCalled();
    });

    it('returns invalid when domains.list returns error (not Unauthorized)', async () => {
      mockDomainsList.mockResolvedValueOnce({ data: null, error: { message: 'Rate limited' } });
      const result = await validateResendConfig({ apiKey: 're_xxx' });
      expect(result).toEqual({ ok: false, error: 'Rate limited', status: 'invalid' });
    });

    it('returns connected when error message includes Unauthorized', async () => {
      mockDomainsList.mockResolvedValueOnce({ data: null, error: { message: 'Unauthorized' } });
      const result = await validateResendConfig({ apiKey: 're_xxx' });
      expect(result).toEqual({ ok: true, status: 'connected' });
    });

    it('returns invalid when domains.list throws', async () => {
      mockDomainsList.mockRejectedValueOnce(new Error('Network error'));
      const result = await validateResendConfig({ apiKey: 're_xxx' });
      expect(result).toMatchObject({ ok: false, status: 'invalid' });
      expect(result.error).toContain('Network error');
    });
  });

  describe('resendMetadataFromConfig', () => {
    it('returns trimmed senderEmail and senderName', () => {
      const result = resendMetadataFromConfig({
        senderEmail: '  a@b.com  ',
        senderName: '  Acme  ',
      });
      expect(result).toEqual({ senderEmail: 'a@b.com', senderName: 'Acme' });
    });

    it('returns null for missing fields', () => {
      const result = resendMetadataFromConfig({});
      expect(result).toEqual({ senderEmail: null, senderName: null });
    });
  });
});
