/**
 * Unit tests for get-mailchimp-meta API (Mailchimp connection meta for UI).
 */

const mockGetMailchimpCredentials = jest.fn();

jest.mock('@/lib/marketing/mailchimpApiService', () => ({
  getMailchimpCredentials: (...args) => mockGetMailchimpCredentials(...args),
}));

function mockRes() {
  return {
    status: jest.fn(function statusFn(c) {
      this.statusCode = c;
      return this;
    }),
    setHeader: jest.fn(),
    json: jest.fn(function jsonFn(d) {
      this._json = d;
      return this;
    }),
  };
}

describe('get-mailchimp-meta API', () => {
  let handler;

  beforeAll(async () => {
    ({ default: handler } = await import('@/pages/api/get-mailchimp-meta'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMailchimpCredentials.mockResolvedValue({ serverPrefix: 'us19', apiKey: 'k' });
  });

  it('returns 405 for non-POST', async () => {
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when organizationId is missing', async () => {
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing organizationId',
      connected: false,
    });
  });

  it('treats missing body as empty object', async () => {
    const res = mockRes();
    await handler({ method: 'POST' }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing organizationId',
      connected: false,
    });
  });

  it('returns connected false when credentials are absent', async () => {
    mockGetMailchimpCredentials.mockResolvedValue(null);
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ connected: false });
  });

  it('returns connected true and serverPrefix when Mailchimp is configured', async () => {
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res);
    expect(mockGetMailchimpCredentials).toHaveBeenCalledWith('org-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      connected: true,
      serverPrefix: 'us19',
    });
  });

  it('defaults serverPrefix to us21 when missing on credentials', async () => {
    mockGetMailchimpCredentials.mockResolvedValue({ apiKey: 'k' });
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-x' } }, res);
    expect(res.json).toHaveBeenCalledWith({
      connected: true,
      serverPrefix: 'us21',
    });
  });

  it('returns connected false with error message when getMailchimpCredentials throws', async () => {
    mockGetMailchimpCredentials.mockRejectedValue(new Error('network'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ connected: false, error: 'network' });
    spy.mockRestore();
  });
});
