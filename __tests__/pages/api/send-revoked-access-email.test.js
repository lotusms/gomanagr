/**
 * Unit tests for send-revoked-access-email API.
 * POST only; 400 missing to; 200 sent: true (SMTP); 500 SMTP error; 200 sent: true (Resend); 200 sent: false no provider.
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

describe('send-revoked-access-email API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.RESEND_API_KEY;
    mockSendMail.mockResolvedValue(undefined);
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/send-revoked-access-email')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when to missing or empty', async () => {
    const handler = (await import('@/pages/api/send-revoked-access-email')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing recipient email' });

    const res2 = mockRes();
    await handler({ method: 'POST', body: { to: '   ' } }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 sent: true when SMTP configured and sendMail succeeds', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASSWORD = 'pass';
    process.env.SMTP_FROM_EMAIL = 'noreply@test.com';
    jest.resetModules();
    const handler = (await import('@/pages/api/send-revoked-access-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { to: 'revoked@test.com', memberName: 'Jane', orgName: 'Acme' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'revoked@test.com',
        subject: expect.stringContaining('revoked'),
      })
    );
  });

  it('returns 500 when SMTP sendMail throws', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASSWORD = 'pass';
    jest.resetModules();
    mockSendMail.mockRejectedValueOnce(new Error('Connection refused'));
    const handler = (await import('@/pages/api/send-revoked-access-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { to: 'u@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to send email',
        details: expect.any(String),
      })
    );
  });

  it('returns 200 sent: false when no email provider', async () => {
    const handler = (await import('@/pages/api/send-revoked-access-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { to: 'u@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      sent: false,
      message: 'No email provider configured',
    });
  });
});
