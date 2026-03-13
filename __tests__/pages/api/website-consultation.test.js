/**
 * Unit tests for website-consultation API.
 * POST only; 400 missing name/email; 200 when SMTP configured (sent) or not (received); 500 on send error.
 */

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));

jest.mock('nodemailer', () => ({
  createTransport: (...args) => mockCreateTransport(...args),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_APP_NAME = 'GoManagr';
});

function mockRes() {
  return {
    status: jest.fn(function (c) {
      this.statusCode = c;
      return this;
    }),
    json: jest.fn(function (d) {
      this._json = d;
      return this;
    }),
  };
}

describe('website-consultation API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue(undefined);
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/website-consultation')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when name or email missing', async () => {
    const handler = (await import('@/pages/api/website-consultation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { email: 'user@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Name and email are required' });
  });

  it('returns 200 with message received when SMTP not configured', async () => {
    const handler = (await import('@/pages/api/website-consultation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { name: 'Jane', email: 'jane@test.com', company: 'Acme', message: 'Hello' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, message: 'Request received' });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('returns 200 with message sent when SMTP configured and sendMail succeeds', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASSWORD = 'pass';
    process.env.SMTP_FROM_EMAIL = 'noreply@test.com';
    jest.resetModules();
    const handler = (await import('@/pages/api/website-consultation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { name: 'Jane', email: 'jane@test.com', company: 'Acme', message: 'Hello' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, message: 'Request sent' });
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('returns 500 when SMTP send fails', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASSWORD = 'pass';
    mockSendMail.mockRejectedValueOnce(new Error('Connection refused'));
    jest.resetModules();
    const handler = (await import('@/pages/api/website-consultation')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { name: 'Jane', email: 'jane@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to send request',
        message: expect.any(String),
      })
    );
  });
});
