/**
 * Unit tests for get-mailchimp-templates API.
 */

const mockGetMailchimpCredentials = jest.fn();
const mockListTemplates = jest.fn();

jest.mock('@/lib/marketing/mailchimpApiService', () => ({
  getMailchimpCredentials: (...args) => mockGetMailchimpCredentials(...args),
  listTemplates: (...args) => mockListTemplates(...args),
}));

function mockRes() {
  return {
    status: jest.fn(function (c) { this.statusCode = c; return this; }),
    setHeader: jest.fn(),
    json: jest.fn(function (d) { this._json = d; return this; }),
  };
}

describe('get-mailchimp-templates API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-mailchimp-templates')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 when organizationId missing', async () => {
    const handler = (await import('@/pages/api/get-mailchimp-templates')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing organizationId', templates: [] });
  });

  it('returns 200 with empty templates when Mailchimp not connected', async () => {
    mockGetMailchimpCredentials.mockResolvedValue(null);
    const handler = (await import('@/pages/api/get-mailchimp-templates')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      templates: [],
      warning: 'Mailchimp is not connected for this organization.',
    });
  });

  it('returns 200 with templates when creds present', async () => {
    mockGetMailchimpCredentials.mockResolvedValue({ apiKey: 'key', serverPrefix: 'us21' });
    mockListTemplates.mockResolvedValue([{ id: 1, name: 'Template 1', type: 'user' }]);
    const handler = (await import('@/pages/api/get-mailchimp-templates')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      templates: [{ id: 1, name: 'Template 1', type: 'user' }],
      serverPrefix: 'us21',
    });
  });

  it('returns 200 with empty templates and error on listTemplates throw', async () => {
    mockGetMailchimpCredentials.mockResolvedValue({ apiKey: 'key', serverPrefix: 'us21' });
    mockListTemplates.mockRejectedValue(new Error('API error'));
    const handler = (await import('@/pages/api/get-mailchimp-templates')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      templates: [],
      error: expect.stringMatching(/API error|Failed to fetch/),
    });
  });
});
