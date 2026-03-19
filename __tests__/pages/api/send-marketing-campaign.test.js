/**
 * Unit tests for send-marketing-campaign API.
 */

const mockGetMailchimpCredentials = jest.fn();
const mockFindOrCreateList = jest.fn();
const mockBatchAddMembers = jest.fn();
const mockCreateStaticSegment = jest.fn();
const mockCreateAndSendCampaign = jest.fn();

jest.mock('@/lib/marketing/mailchimpApiService', () => ({
  getMailchimpCredentials: (...args) => mockGetMailchimpCredentials(...args),
  findOrCreateList: (...args) => mockFindOrCreateList(...args),
  batchAddMembers: (...args) => mockBatchAddMembers(...args),
  createStaticSegment: (...args) => mockCreateStaticSegment(...args),
  createAndSendCampaign: (...args) => mockCreateAndSendCampaign(...args),
}));

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mockFrom }) }));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return {
    status: jest.fn(function (c) { this.statusCode = c; return this; }),
    setHeader: jest.fn(),
    json: jest.fn(function (d) { this._json = d; return this; }),
  };
}

describe('send-marketing-campaign API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMailchimpCredentials.mockResolvedValue({
      apiKey: 'key',
      serverPrefix: 'us21',
      senderEmail: 'sender@test.com',
      senderName: 'Test',
    });
    mockFindOrCreateList.mockResolvedValue('list-1');
    mockBatchAddMembers.mockResolvedValue({ total_created: 1, total_updated: 0, error_count: 0 });
    mockCreateStaticSegment.mockResolvedValue(100);
    mockCreateAndSendCampaign.mockResolvedValue({ campaignId: 'mc-1', success: true });
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/send-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 when required fields missing', async () => {
    const handler = (await import('@/pages/api/send-marketing-campaign')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
  });

  it('returns 200 with error when no provider configured', async () => {
    mockGetMailchimpCredentials.mockResolvedValue(null);
    const handler = (await import('@/pages/api/send-marketing-campaign')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', campaign: { channel: 'email' }, recipients: [{ email: 'a@b.com' }] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringMatching(/No supported provider|integration settings/),
    });
  });

  it('returns 200 with error when sender email not configured', async () => {
    mockGetMailchimpCredentials.mockResolvedValue({
      apiKey: 'key',
      serverPrefix: 'us21',
      senderEmail: '',
      senderName: 'Test',
    });
    const handler = (await import('@/pages/api/send-marketing-campaign')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', campaign: { channel: 'email' }, recipients: [{ email: 'a@b.com' }] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringMatching(/Sender email|Mailchimp/),
    });
  });

  it('returns 200 with error when no recipients with email', async () => {
    const handler = (await import('@/pages/api/send-marketing-campaign')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', campaign: { channel: 'email' }, recipients: [{ name: 'No Email' }] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'No recipients with email addresses',
    });
  });

  it('returns 200 with success when Mailchimp send succeeds', async () => {
    const handler = (await import('@/pages/api/send-marketing-campaign')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        organizationId: 'org-1',
        campaign: { id: 'c1', channel: 'email', subject: 'Hi', name: 'Campaign' },
        recipients: [{ email: 'a@b.com' }],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      messageId: 'mc-1',
      error: undefined,
    });
  });

  it('returns 200 with error when createAndSendCampaign throws', async () => {
    mockCreateAndSendCampaign.mockRejectedValue(new Error('Mailchimp API error'));
    const handler = (await import('@/pages/api/send-marketing-campaign')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        organizationId: 'org-1',
        campaign: { id: 'c1', channel: 'email' },
        recipients: [{ email: 'a@b.com' }],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringMatching(/Mailchimp campaign send failed/),
    });
  });
});
