/**
 * Unit tests for get-org-integration: getOrgIntegration, listOrgIntegrations,
 * saveOrgIntegration, getOrgIntegrationSummary.
 */
const mockDecryptConfig = jest.fn();
const mockEncryptConfig = jest.fn();
jest.mock('@/lib/integrations/encryption', () => ({
  decryptConfig: (...args) => mockDecryptConfig(...args),
  encryptConfig: (...args) => mockEncryptConfig(...args),
}));

const mockFrom = jest.fn();
const mockSupabase = { from: mockFrom };
const mockCreateClient = jest.fn(() => mockSupabase);
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

describe('get-org-integration', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockDecryptConfig.mockReturnValue({ decrypted: { apiKey: 're_xxx' } });
    mockEncryptConfig.mockReturnValue({ encrypted: 'mock-encrypted-base64' });
    mockFrom.mockImplementation((table) => {
      if (table !== 'organization_integrations') return {};
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };
    });
  });

  describe('getOrgIntegration', () => {
    it('returns null when supabase or org or provider missing', async () => {
      const { getOrgIntegration } = require('@/lib/integrations/get-org-integration');
      expect(await getOrgIntegration(null, 'stripe')).toBeNull();
      expect(await getOrgIntegration('org1', '')).toBeNull();
      expect(await getOrgIntegration('', 'stripe')).toBeNull();
    });

    it('returns null when row not found or no config_encrypted', async () => {
      mockFrom.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));
      jest.resetModules();
      const { getOrgIntegration } = require('@/lib/integrations/get-org-integration');
      expect(await getOrgIntegration('org1', 'stripe')).toBeNull();
    });

    it('returns decrypted config when row has config_encrypted', async () => {
      const config = { publishableKey: 'pk_xxx', secretKey: 'sk_xxx' };
      mockDecryptConfig.mockReturnValue({ decrypted: config });
      mockFrom.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: '1', organization_id: 'org1', provider: 'stripe', config_encrypted: 'enc' },
          error: null,
        }),
      }));
      jest.resetModules();
      const { getOrgIntegration } = require('@/lib/integrations/get-org-integration');
      const result = await getOrgIntegration('org1', 'stripe');
      expect(result).toEqual({ config, row: expect.any(Object) });
      expect(mockDecryptConfig).toHaveBeenCalledWith('enc');
    });

    it('returns null when decrypt fails', async () => {
      mockDecryptConfig.mockReturnValue({ error: 'Decryption failed' });
      mockFrom.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { config_encrypted: 'enc' },
          error: null,
        }),
      }));
      jest.resetModules();
      const { getOrgIntegration } = require('@/lib/integrations/get-org-integration');
      expect(await getOrgIntegration('org1', 'stripe')).toBeNull();
    });
  });

  describe('listOrgIntegrations', () => {
    it('returns empty when supabase or organizationId missing', async () => {
      const { listOrgIntegrations } = require('@/lib/integrations/get-org-integration');
      expect(await listOrgIntegrations(null)).toEqual([]);
      expect(await listOrgIntegrations('')).toEqual([]);
    });

    it('returns list when data returned', async () => {
      const rows = [
        { provider: 'stripe', status: 'connected', metadata_json: {}, last_validated_at: '2025-01-01' },
      ];
      mockFrom.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: rows, error: null }),
      }));
      jest.resetModules();
      const { listOrgIntegrations } = require('@/lib/integrations/get-org-integration');
      const result = await listOrgIntegrations('org1');
      expect(result).toEqual(rows);
    });

    it('returns empty on error', async () => {
      mockFrom.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'err' } }),
      }));
      jest.resetModules();
      const { listOrgIntegrations } = require('@/lib/integrations/get-org-integration');
      expect(await listOrgIntegrations('org1')).toEqual([]);
    });
  });

  describe('saveOrgIntegration', () => {
    it('returns error when supabase unavailable', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      jest.resetModules();
      const { saveOrgIntegration } = require('@/lib/integrations/get-org-integration');
      const result = await saveOrgIntegration('org1', 'stripe', { apiKey: 'x' });
      expect(result.error).toBe('Service unavailable');
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    });

    it('returns error when encryptConfig fails', async () => {
      mockEncryptConfig.mockReturnValueOnce({ error: 'No key' });
      mockFrom.mockImplementation(() => ({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      }));
      jest.resetModules();
      const { saveOrgIntegration } = require('@/lib/integrations/get-org-integration');
      const result = await saveOrgIntegration('org1', 'stripe', {});
      expect(result.error).toBe('No key');
    });

    it('upserts and returns {} on success', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockImplementation(() => ({
        upsert: mockUpsert,
      }));
      jest.resetModules();
      const { saveOrgIntegration } = require('@/lib/integrations/get-org-integration');
      const result = await saveOrgIntegration('org1', 'stripe', { apiKey: 'pk' }, {}, 'connected');
      expect(result).toEqual({});
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org1',
          provider: 'stripe',
          status: 'connected',
          config_encrypted: 'mock-encrypted-base64',
        }),
        expect.any(Object)
      );
    });

    it('returns error when supabase upsert fails', async () => {
      mockFrom.mockImplementation(() => ({
        upsert: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      }));
      jest.resetModules();
      const { saveOrgIntegration } = require('@/lib/integrations/get-org-integration');
      const result = await saveOrgIntegration('org1', 'stripe', { apiKey: 'pk' });
      expect(result.error).toBe('DB error');
    });
  });

  describe('getOrgIntegrationSummary', () => {
    it('returns null when supabase or org or provider missing', async () => {
      const { getOrgIntegrationSummary } = require('@/lib/integrations/get-org-integration');
      expect(await getOrgIntegrationSummary(null, 'stripe')).toBeNull();
      expect(await getOrgIntegrationSummary('org1', '')).toBeNull();
    });

    it('returns summary when row found', async () => {
      mockFrom.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            provider: 'stripe',
            status: 'connected',
            metadata_json: { publishableKeySuffix: 'xxx' },
            last_validated_at: '2025-01-01T00:00:00Z',
          },
          error: null,
        }),
      }));
      jest.resetModules();
      const { getOrgIntegrationSummary } = require('@/lib/integrations/get-org-integration');
      const result = await getOrgIntegrationSummary('org1', 'stripe');
      expect(result).toEqual({
        provider: 'stripe',
        status: 'connected',
        metadata: { publishableKeySuffix: 'xxx' },
        lastValidatedAt: '2025-01-01T00:00:00Z',
      });
    });

    it('returns null on error or no row', async () => {
      mockFrom.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'err' } }),
      }));
      jest.resetModules();
      const { getOrgIntegrationSummary } = require('@/lib/integrations/get-org-integration');
      expect(await getOrgIntegrationSummary('org1', 'stripe')).toBeNull();
    });
  });
});
