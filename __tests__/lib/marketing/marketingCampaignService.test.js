/**
 * Unit tests for lib/marketing/marketingCampaignService.js
 */
const mockGetActiveProviderForChannel = jest.fn();
const mockRegistrySend = jest.fn();

jest.mock('@/lib/marketing/providerRegistry.js', () => ({
  getActiveProviderForChannel: (...args) => mockGetActiveProviderForChannel(...args),
  sendCampaign: (...args) => mockRegistrySend(...args),
}));

import {
  getCampaigns,
  saveDraft,
  getCampaignsByChannel,
  sendCampaign,
} from '@/lib/marketing/marketingCampaignService.js';

const STORAGE_KEY = 'gomanagr_marketing_campaigns';

describe('marketingCampaignService', () => {
  let storage;

  beforeEach(() => {
    storage = {};
    Object.defineProperty(global, 'window', {
      value: {
        localStorage: {
          getItem: (key) => storage[key] ?? null,
          setItem: (key, val) => { storage[key] = val; },
        },
      },
      writable: true,
    });
    mockGetActiveProviderForChannel.mockReset();
    mockRegistrySend.mockReset();
  });

  afterEach(() => {
    delete global.window;
  });

  describe('getCampaigns', () => {
    it('returns empty array when localStorage is empty', async () => {
      const list = await getCampaigns();
      expect(list).toEqual([]);
    });

    it('returns parsed array when localStorage has valid JSON', async () => {
      const campaigns = [{ id: 'c1', channel: 'email', name: 'Test', body: '', recipientGroup: 'clients', audienceMode: 'all', status: 'draft' }];
      storage[STORAGE_KEY] = JSON.stringify(campaigns);
      const list = await getCampaigns();
      expect(list).toEqual(campaigns);
    });

    it('returns empty array when stored value is not an array', async () => {
      storage[STORAGE_KEY] = JSON.stringify({ foo: 1 });
      const list = await getCampaigns();
      expect(list).toEqual([]);
    });
  });

  describe('saveDraft', () => {
    it('adds new draft with generated id and persists to localStorage', async () => {
      const campaign = {
        channel: 'email',
        name: 'New',
        body: 'Body',
        recipientGroup: 'clients',
        audienceMode: 'all',
        status: 'draft',
      };
      const saved = await saveDraft(campaign);
      expect(saved.id).toBeDefined();
      expect(saved.status).toBe('draft');
      expect(saved.createdAt).toBeDefined();
      const list = await getCampaigns();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(saved.id);
    });

    it('updates existing draft by id', async () => {
      const existing = {
        id: 'draft_123',
        channel: 'email',
        name: 'Old',
        body: 'Body',
        recipientGroup: 'clients',
        audienceMode: 'all',
        status: 'draft',
      };
      storage[STORAGE_KEY] = JSON.stringify([existing]);
      const updated = await saveDraft({ ...existing, name: 'Updated', body: 'New body' });
      expect(updated.id).toBe('draft_123');
      expect(updated.name).toBe('Updated');
      expect(updated.status).toBe('draft');
      const list = await getCampaigns();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Updated');
    });
  });

  describe('getCampaignsByChannel', () => {
    it('filters by channel and sorts by createdAt desc', async () => {
      const campaigns = [
        { id: '1', channel: 'email', createdAt: '2024-01-01', name: 'A', body: '', recipientGroup: 'clients', audienceMode: 'all', status: 'draft' },
        { id: '2', channel: 'sms', createdAt: '2024-01-02', name: 'B', body: '', recipientGroup: 'clients', audienceMode: 'all', status: 'draft' },
        { id: '3', channel: 'email', createdAt: '2024-01-03', name: 'C', body: '', recipientGroup: 'clients', audienceMode: 'all', status: 'draft' },
      ];
      storage[STORAGE_KEY] = JSON.stringify(campaigns);
      const emailList = await getCampaignsByChannel('email');
      expect(emailList).toHaveLength(2);
      expect(emailList[0].id).toBe('3');
      expect(emailList[1].id).toBe('1');
    });
  });

  describe('sendCampaign', () => {
    it('returns error when no active email provider', async () => {
      mockGetActiveProviderForChannel.mockResolvedValue(null);
      const campaign = { id: 'c1', channel: 'email', name: 'C', body: 'B', recipientGroup: 'clients', audienceMode: 'all', status: 'draft' };
      const result = await sendCampaign(campaign, []);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No email provider configured or enabled.');
    });

    it('returns error when no active SMS provider', async () => {
      mockGetActiveProviderForChannel.mockResolvedValue(null);
      const campaign = { id: 'c1', channel: 'sms', name: 'C', body: 'B', recipientGroup: 'clients', audienceMode: 'all', status: 'draft' };
      const result = await sendCampaign(campaign, []);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No SMS provider configured or enabled.');
    });

    it('calls registry send and updates campaign status on success', async () => {
      mockGetActiveProviderForChannel.mockResolvedValue({});
      mockRegistrySend.mockResolvedValue({ success: true, messageId: 'msg_1' });
      const campaign = { id: 'c1', channel: 'email', name: 'C', body: 'B', recipientGroup: 'clients', audienceMode: 'all', status: 'draft' };
      const result = await sendCampaign(campaign, [{ id: 'r1', email: 'a@b.com' }]);
      expect(result.success).toBe(true);
      expect(mockRegistrySend).toHaveBeenCalledWith('email', { subject: undefined, body: 'B', recipients: [{ id: 'r1', email: 'a@b.com' }] });
      const list = await getCampaigns();
      expect(list).toHaveLength(1);
      expect(list[0].status).toBe('sent');
      expect(list[0].sentAt).toBeDefined();
    });

    it('updates campaign status to failed when registry send fails', async () => {
      mockGetActiveProviderForChannel.mockResolvedValue({});
      mockRegistrySend.mockResolvedValue({ success: false, error: 'API error' });
      const campaign = { id: 'c1', channel: 'email', name: 'C', body: 'B', recipientGroup: 'clients', audienceMode: 'all', status: 'draft' };
      storage[STORAGE_KEY] = JSON.stringify([campaign]);
      const result = await sendCampaign(campaign, []);
      expect(result.success).toBe(false);
      const list = await getCampaigns();
      expect(list[0].status).toBe('failed');
      expect(list[0].errorMessage).toBe('API error');
    });
  });
});
