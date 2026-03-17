/**
 * Unit tests for send-revoked-access-email API.
 * POST only; requires organizationId. Uses sendTenantEmail (tenant integrations).
 * 400 missing to or organizationId; 200 sent: true; 503 when sendTenantEmail returns sent: false.
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

describe('send-revoked-access-email API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendTenantEmail.mockResolvedValue({ sent: true });
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
    await handler({ method: 'POST', body: { organizationId: ORG_ID } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing recipient email' });

    const res2 = mockRes();
    await handler({ method: 'POST', body: { organizationId: ORG_ID, to: '   ' } }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when organizationId missing', async () => {
    const handler = (await import('@/pages/api/send-revoked-access-email')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { to: 'u@test.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing organizationId' });
  });

  it('returns 200 sent: true when sendTenantEmail succeeds', async () => {
    const handler = (await import('@/pages/api/send-revoked-access-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: ORG_ID, to: 'revoked@test.com', memberName: 'Jane', orgName: 'Acme' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true });
    expect(mockSendTenantEmail).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({
        to: 'revoked@test.com',
        subject: expect.stringContaining('revoked'),
      })
    );
  });

  it('returns 503 when sendTenantEmail returns sent: false', async () => {
    mockSendTenantEmail.mockResolvedValueOnce({ sent: false, error: 'Connection refused' });
    const handler = (await import('@/pages/api/send-revoked-access-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: ORG_ID, to: 'u@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Connection refused',
        sent: false,
      })
    );
  });

  it('returns 503 when no email provider', async () => {
    mockSendTenantEmail.mockResolvedValueOnce({
      sent: false,
      error: 'No email provider configured. Configure Resend or SMTP in Settings > Integrations.',
    });
    const handler = (await import('@/pages/api/send-revoked-access-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: ORG_ID, to: 'u@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        sent: false,
        error: expect.any(String),
      })
    );
  });
});
