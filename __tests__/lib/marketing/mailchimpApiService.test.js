/**
 * Unit tests for mailchimpApiService (server-side Mailchimp API).
 */

const mockGetOrgIntegration = jest.fn();
jest.mock('@/lib/integrations/get-org-integration', () => ({
  getOrgIntegration: (...args) => mockGetOrgIntegration(...args),
}));

let fetchCalls = [];
const mockFetch = jest.fn((url, opts) => {
  fetchCalls.push({ url, opts });
  return Promise.resolve({
    ok: true,
    text: () => Promise.resolve(JSON.stringify({ templates: [], lists: [] })),
  });
});

global.fetch = mockFetch;

describe('mailchimpApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchCalls = [];
    mockFetch.mockImplementation((url, opts) => {
      fetchCalls.push({ url, opts });
      if (url.includes('/templates?')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({
            templates: [{ id: 1, name: 'T1', type: 'user', thumbnail: '', date_created: '', active: true }],
          })),
        });
      }
      if (url.includes('/segments') && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify({ id: 100 })) });
      }
      if (url.includes('/lists?') || (url.includes('/lists/') && !url.includes('/segments'))) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ lists: [{ id: 'list-1', name: 'GoManagr Contacts' }], id: 'list-1' })),
        });
      }
      if (url.includes('/campaigns') && !url.includes('content') && !url.includes('send-checklist') && !url.includes('actions/send')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ id: 'camp-1', settings: {}, recipients: {}, tracking: {} })),
        });
      }
      if (url.includes('/content')) {
        const longHtml = '<html><body><p>Rendered campaign content with enough length for verification</p></body></html>';
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify({ html: longHtml })) });
      }
      if (url.includes('send-checklist')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ is_ready: true, items: [] })),
        });
      }
      if (url.includes('actions/send')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('') });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
    });
  });

  describe('getMailchimpCredentials', () => {
    it('returns null when organizationId is falsy', async () => {
      const { getMailchimpCredentials } = await import('@/lib/marketing/mailchimpApiService');
      expect(await getMailchimpCredentials(null)).toBeNull();
      expect(await getMailchimpCredentials('')).toBeNull();
      expect(mockGetOrgIntegration).not.toHaveBeenCalled();
    });

    it('returns null when getOrgIntegration has no config', async () => {
      mockGetOrgIntegration.mockResolvedValue({});
      const { getMailchimpCredentials } = await import('@/lib/marketing/mailchimpApiService');
      expect(await getMailchimpCredentials('org-1')).toBeNull();
    });

    it('returns null when apiKey or serverPrefix missing', async () => {
      mockGetOrgIntegration.mockResolvedValue({ config: { senderEmail: 'a@b.com', senderName: 'A' } });
      const { getMailchimpCredentials } = await import('@/lib/marketing/mailchimpApiService');
      expect(await getMailchimpCredentials('org-1')).toBeNull();
    });

    it('returns trimmed credentials when config present', async () => {
      mockGetOrgIntegration.mockResolvedValue({
        config: {
          apiKey: '  key  ',
          serverPrefix: ' us21 ',
          senderEmail: ' sender@test.com ',
          senderName: ' Sender ',
        },
      });
      const { getMailchimpCredentials } = await import('@/lib/marketing/mailchimpApiService');
      const creds = await getMailchimpCredentials('org-1');
      expect(creds).toEqual({
        apiKey: 'key',
        serverPrefix: 'us21',
        senderEmail: 'sender@test.com',
        senderName: 'Sender',
      });
    });
  });

  describe('listTemplates', () => {
    it('returns mapped templates from API', async () => {
      const { listTemplates } = await import('@/lib/marketing/mailchimpApiService');
      const list = await listTemplates('key', 'us21');
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ id: 1, name: 'T1', type: 'user', active: true });
    });
  });

  describe('fetchTemplateHtml', () => {
    it('returns html from template object when present', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/templates/1') && !url.includes('default-content')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({
              html: '<html><body><p>Hello from template</p></body></html>',
            })),
          });
        }
        return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
      });
      const { fetchTemplateHtml } = await import('@/lib/marketing/mailchimpApiService');
      const out = await fetchTemplateHtml('key', 'us21', 1);
      expect(out.available).toBe(true);
      expect(out.html).toContain('Hello from template');
    });
  });

  describe('findOrCreateList', () => {
    it('returns existing list id when GoManagr Contacts exists', async () => {
      const { findOrCreateList } = await import('@/lib/marketing/mailchimpApiService');
      const listId = await findOrCreateList('key', 'us21', 'sender@test.com', 'Sender');
      expect(listId).toBe('list-1');
    });
  });

  describe('batchAddMembers', () => {
    it('returns total_created and total_updated from API', async () => {
      mockFetch.mockImplementation((url, opts) => {
        if (url.includes('/lists/') && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ total_created: 2, total_updated: 0, error_count: 0 })),
          });
        }
        return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
      });
      const { batchAddMembers } = await import('@/lib/marketing/mailchimpApiService');
      const result = await batchAddMembers('key', 'us21', 'list-1', [
        { email: 'a@b.com', firstName: 'A' },
        { email: 'b@b.com' },
      ]);
      expect(result).toEqual({ total_created: 2, total_updated: 0, error_count: 0 });
    });

    it('returns zeros when members array empty', async () => {
      const { batchAddMembers } = await import('@/lib/marketing/mailchimpApiService');
      const result = await batchAddMembers('key', 'us21', 'list-1', []);
      expect(result).toEqual({ total_created: 0, total_updated: 0, error_count: 0 });
    });
  });

  describe('createStaticSegment', () => {
    it('returns segment id from API', async () => {
      const { createStaticSegment } = await import('@/lib/marketing/mailchimpApiService');
      const id = await createStaticSegment('key', 'us21', 'list-1', 'Seg', ['a@b.com']);
      expect(id).toBe(100);
    });
  });

  describe('createAndSendCampaign', () => {
    it('creates campaign, sets content, and sends when sendImmediately true', async () => {
      const { createAndSendCampaign } = await import('@/lib/marketing/mailchimpApiService');
      const result = await createAndSendCampaign('key', 'us21', {
        listId: 'list-1',
        segmentId: 100,
        subject: 'Test',
        fromName: 'Sender',
        fromEmail: 'sender@test.com',
        templateId: null,
        html: '<p>Hello</p>',
        plainText: null,
        sendImmediately: true,
      });
      expect(result).toEqual({ campaignId: 'camp-1', success: true });
    });

    it('prefers edited html over Mailchimp template fetch when both templateId and html are set', async () => {
      const putBodies = [];
      mockFetch.mockImplementation((url, opts) => {
        fetchCalls.push({ url, opts });
        if (url.includes('/templates/') && opts?.method !== 'PUT' && !url.includes('/campaigns/')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ html: '' })),
          });
        }
        if (url.includes('/campaigns/') && url.includes('/content') && opts?.method === 'PUT') {
          putBodies.push(opts.body);
          return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
        }
        if (url.includes('/campaigns') && !url.includes('content') && !url.includes('send')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ id: 'camp-1', settings: {}, recipients: {}, tracking: {} })),
          });
        }
        if (url.includes('/content') && !opts?.method) {
          const longHtml = '<html><body><p>Edited in GoManagr with enough length for verification</p></body></html>';
          return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify({ html: longHtml })) });
        }
        if (url.includes('actions/send')) {
          return Promise.resolve({ ok: true, text: () => Promise.resolve('') });
        }
        return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
      });
      const longEdited =
        '<html><body><p>Edited in GoManagr with enough length for verification</p></body></html>';
      const { createAndSendCampaign } = await import('@/lib/marketing/mailchimpApiService');
      await createAndSendCampaign('key', 'us21', {
        listId: 'list-1',
        segmentId: 100,
        subject: 'Test',
        fromName: 'Sender',
        fromEmail: 'sender@test.com',
        templateId: 999,
        html: longEdited,
        plainText: null,
        sendImmediately: true,
      });
      expect(putBodies.some((b) => b && b.includes('Edited in GoManagr'))).toBe(true);
    });
  });
});
