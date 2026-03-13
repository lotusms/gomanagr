/**
 * Unit tests for send-invite-email API.
 * POST only; 400 missing to or inviteLink; 200 sent: true (SMTP path); 500 SMTP error;
 * 200 sent: false with inviteLink when no provider.
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

describe('send-invite-email API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.RESEND_API_KEY;
    mockSendMail.mockResolvedValue(undefined);
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/send-invite-email')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when to or inviteLink missing', async () => {
    const handler = (await import('@/pages/api/send-invite-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { to: 'user@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing to or inviteLink' });

    const res2 = mockRes();
    await handler({
      method: 'POST',
      body: { inviteLink: 'https://app.com/invite/abc' },
    }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
    expect(res2.json).toHaveBeenCalledWith({ error: 'Missing to or inviteLink' });
  });

  it('returns 200 sent: true when SMTP configured and sendMail succeeds', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASSWORD = 'pass';
    process.env.SMTP_FROM_EMAIL = 'invites@test.com';
    jest.resetModules();
    const handler = (await import('@/pages/api/send-invite-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        to: 'invitee@test.com',
        inviteLink: 'https://app.com/invite/token123',
        memberName: 'Jane',
        inviterName: 'Admin',
        inviterEmail: 'admin@test.com',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true, message: 'Invite email sent' });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'invitee@test.com',
        subject: expect.stringContaining('invited'),
        replyTo: 'admin@test.com',
      })
    );
  });

  it('returns 500 when SMTP sendMail throws', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASSWORD = 'pass';
    jest.resetModules();
    mockSendMail.mockRejectedValueOnce(new Error('Connection refused'));
    const handler = (await import('@/pages/api/send-invite-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { to: 'u@test.com', inviteLink: 'https://app.com/invite/x' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to send email',
        details: expect.any(String),
      })
    );
  });

  it('returns 200 sent: false with inviteLink when no email provider', async () => {
    const handler = (await import('@/pages/api/send-invite-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        to: 'invitee@test.com',
        inviteLink: 'https://app.com/invite/manual',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      sent: false,
      inviteLink: 'https://app.com/invite/manual',
      message: 'No email provider configured. Share the invite link manually.',
    });
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });
});
