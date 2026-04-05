/**
 * Unit tests for get-mailchimp-template-html API.
 */

const mockGetMailchimpCredentials = jest.fn();
const mockFetchTemplateHtml = jest.fn();

jest.mock('@/lib/marketing/mailchimpApiService', () => ({
  getMailchimpCredentials: (...args) => mockGetMailchimpCredentials(...args),
  fetchTemplateHtml: (...args) => mockFetchTemplateHtml(...args),
}));

function mockRes() {
  return {
    status: jest.fn(function (c) { this.statusCode = c; return this; }),
    setHeader: jest.fn(),
    json: jest.fn(function (d) { this._json = d; return this; }),
  };
}

describe('get-mailchimp-template-html API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-mailchimp-template-html')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 when organizationId or templateId missing', async () => {
    const handler = (await import('@/pages/api/get-mailchimp-template-html')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with html when Mailchimp connected', async () => {
    mockGetMailchimpCredentials.mockResolvedValue({ apiKey: 'k', serverPrefix: 'us21' });
    mockFetchTemplateHtml.mockResolvedValue({ html: '<html><body>Hi</body></html>', available: true });
    const handler = (await import('@/pages/api/get-mailchimp-template-html')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1', templateId: 42 } }, res);
    expect(mockFetchTemplateHtml).toHaveBeenCalledWith('k', 'us21', 42);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      html: '<html><body>Hi</body></html>',
      available: true,
      serverPrefix: 'us21',
    });
  });

  it('returns 200 with warning when not connected', async () => {
    mockGetMailchimpCredentials.mockResolvedValue(null);
    const handler = (await import('@/pages/api/get-mailchimp-template-html')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1', templateId: 1 } }, res);
    expect(res.json).toHaveBeenCalledWith({
      html: '',
      available: false,
      warning: 'Mailchimp is not connected for this organization.',
    });
  });
});
