/**
 * Unit tests for send-invite-email API.
 * POST only; requires organizationId. Uses sendTenantEmail (tenant integrations).
 * 400 missing to, inviteLink, or organizationId; 200 sent: true; 503 when sendTenantEmail returns sent: false.
 */

const mockSendTenantEmail = jest.fn();

jest.mock('@/lib/sendTenantEmail', () => ({
  sendTenantEmail: (...args) => mockSendTenantEmail(...args),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_APP_NAME = 'GoManagr';
});

const ORG_ID = 'org-1';

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
    mockSendTenantEmail.mockResolvedValue({ sent: true });
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
      body: { organizationId: ORG_ID, to: 'user@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing to or inviteLink' });

    const res2 = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: ORG_ID, inviteLink: 'https://app.com/invite/abc' },
    }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
    expect(res2.json).toHaveBeenCalledWith({ error: 'Missing to or inviteLink' });
  });

  it('returns 400 when organizationId missing', async () => {
    const handler = (await import('@/pages/api/send-invite-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { to: 'u@test.com', inviteLink: 'https://app.com/invite/x' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing organizationId' });
  });

  it('returns 200 sent: true when sendTenantEmail succeeds', async () => {
    const handler = (await import('@/pages/api/send-invite-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: ORG_ID,
        to: 'invitee@test.com',
        inviteLink: 'https://app.com/invite/token123',
        memberName: 'Jane',
        inviterName: 'Admin',
        inviterEmail: 'admin@test.com',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true, message: 'Invite email sent' });
    expect(mockSendTenantEmail).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({
        to: 'invitee@test.com',
        subject: expect.stringContaining('invited'),
        replyTo: 'admin@test.com',
      })
    );
  });

  it('returns 503 when sendTenantEmail returns sent: false', async () => {
    mockSendTenantEmail.mockResolvedValueOnce({ sent: false, error: 'Connection refused' });
    const handler = (await import('@/pages/api/send-invite-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: ORG_ID,
        to: 'u@test.com',
        inviteLink: 'https://app.com/invite/x',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Connection refused',
        inviteLink: 'https://app.com/invite/x',
      })
    );
  });

  it('returns 503 with inviteLink when no email provider', async () => {
    mockSendTenantEmail.mockResolvedValueOnce({
      sent: false,
      error: 'No email provider configured. Configure Resend or SMTP in Settings > Integrations.',
    });
    const handler = (await import('@/pages/api/send-invite-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: ORG_ID,
        to: 'invitee@test.com',
        inviteLink: 'https://app.com/invite/manual',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(String),
        inviteLink: 'https://app.com/invite/manual',
      })
    );
  });
});
