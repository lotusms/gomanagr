/**
 * Unit tests for send-receipt-email API.
 * POST only; 400 missing params / invalid email; 503 Supabase unavailable; 404 invoice not found;
 * 403 ownership; 503 no email provider; 200 sent when SMTP configured.
 */

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));

jest.mock('nodemailer', () => ({
  createTransport: (...args) => mockCreateTransport(...args),
}));

jest.mock('@/lib/renderDocumentToHtml', () => ({
  renderDocumentToHtml: jest.fn(() => '<html><body>Receipt</body></html>'),
}));

const mockBuildInvoiceDocumentPayload = jest.fn(() => ({ lineItems: [], total: 100 }));
jest.mock('@/lib/buildDocumentPayload', () => ({
  buildInvoiceDocumentPayload: (...args) => mockBuildInvoiceDocumentPayload(...args),
}));

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

const mockResendSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
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

const defaultInvoice = {
  id: 'inv-1',
  user_id: 'u1',
  organization_id: null,
  invoice_number: 'INV-001',
  total: 100,
  outstanding_balance: 0,
  paid_date: '2025-01-15',
  client_id: 'c1',
  client_snapshot: { name: 'Client Co' },
};

describe('send-receipt-email API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockImplementation(() => ({ from: mockFrom }));
    delete process.env.SMTP_HOST;
    delete process.env.RESEND_API_KEY;
    mockSendMail.mockResolvedValue(undefined);
    mockResendSend.mockResolvedValue({ data: {}, error: null });
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: defaultInvoice, error: null }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { company_name: 'My Co', company_logo: '', profile: {}, clients: [] },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId, invoiceId, or to missing', async () => {
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing userId, invoiceId, or to (recipient email)',
    });
  });

  it('returns 400 when to is invalid email', async () => {
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'invalid' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email address' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 404 when invoice not found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'bad-id', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
  });

  it('returns 403 when invoice does not belong to user (no org)', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...defaultInvoice, user_id: 'other', organization_id: null },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice does not belong to you' });
  });

  it('returns 503 when no email provider configured', async () => {
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'No email provider configured',
        message: expect.stringContaining('SMTP'),
      })
    );
  });

  it('returns 200 sent: true when SMTP configured and sendMail succeeds', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASSWORD = 'pass';
    process.env.SMTP_FROM_EMAIL = 'receipts@test.com';
    jest.resetModules();
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true, message: 'Receipt email sent' });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'client@test.com',
        subject: expect.stringMatching(/Receipt #/),
        html: expect.any(String),
      })
    );
  });

  it('returns 403 when organizationId provided but invoice belongs to different org', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...defaultInvoice, organization_id: 'org-other' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { company_name: 'Co', profile: {}, clients: [] }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice does not belong to this organization' });
  });

  it('returns 403 when organizationId provided but user not org member', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...defaultInvoice, organization_id: 'org-1' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { company_name: 'Co', profile: {}, clients: [] }, error: null }),
            }),
          }),
        };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('succeeds with organizationId and fetches org for display (name, address, phone, website)', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASSWORD = 'pass';
    process.env.SMTP_FROM_EMAIL = 'noreply@test.com';
    const invoiceWithOrg = { ...defaultInvoice, organization_id: 'org-1' };
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: invoiceWithOrg, error: null }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { company_name: 'My Co', company_logo: '', profile: {}, clients: [] },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    name: 'Org Name',
                    logo_url: 'https://logo.url',
                    address_line_1: '1 Main St',
                    address_line_2: 'Suite 2',
                    city: 'City',
                    state: 'ST',
                    postal_code: '12345',
                    country: 'US',
                    phone: '555-1234',
                    website: 'https://org.com',
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    jest.resetModules();
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSendMail).toHaveBeenCalled();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM_EMAIL;
  });

  it('uses profile.clients client for name and address when client_id matches', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'u';
    process.env.SMTP_PASSWORD = 'p';
    process.env.SMTP_FROM_EMAIL = 'x@test.com';
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      ...defaultInvoice,
                      client_id: 'c1',
                      client_snapshot: { name: 'Snapshot Name' },
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    company_name: 'Co',
                    profile: {},
                    clients: [
                      {
                        id: 'c1',
                        firstName: 'Jane',
                        lastName: 'Doe',
                        billingAddress: { address1: '1 Billing St', address2: 'Apt 1' },
                        companyAddress: {},
                      },
                    ],
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    jest.resetModules();
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSendMail).toHaveBeenCalled();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM_EMAIL;
  });

  it('uses client_snapshot.addressLines when present', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'u';
    process.env.SMTP_PASSWORD = 'p';
    process.env.SMTP_FROM_EMAIL = 'x@test.com';
    mockFrom.mockImplementation((t) => {
      if (t === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      ...defaultInvoice,
                      client_snapshot: {
                        name: 'Client',
                        addressLines: ['123 Main St', 'City, ST 12345'],
                      },
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { company_name: 'Co', profile: {}, clients: [] }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    jest.resetModules();
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM_EMAIL;
  });

  it('returns 200 when Resend configured and send succeeds', async () => {
    process.env.RESEND_API_KEY = 're_xxx';
    mockResendSend.mockResolvedValueOnce({ data: { id: 'msg-1' }, error: null });
    jest.resetModules();
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true, message: 'Receipt email sent' });
    expect(mockResendSend).toHaveBeenCalled();
    delete process.env.RESEND_API_KEY;
  });

  it('returns 500 when Resend returns error', async () => {
    process.env.RESEND_API_KEY = 're_xxx';
    mockResendSend.mockResolvedValueOnce({ error: { message: 'Resend failed' } });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.resetModules();
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to send email',
        details: 'Resend failed',
      })
    );
    spy.mockRestore();
    delete process.env.RESEND_API_KEY;
  });

  it('returns 503 when createClient throws at module load', async () => {
    mockCreateClient.mockImplementationOnce(() => {
      throw new Error('Supabase init failed');
    });
    jest.resetModules();
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
  });

  it('returns 500 when handler throws (e.g. buildDocumentPayload)', async () => {
    mockBuildInvoiceDocumentPayload.mockImplementation(() => {
      throw new Error('Document build failed');
    });
    jest.resetModules();
    const handler = (await import('@/pages/api/send-receipt-email')).default;
    const res = mockRes();
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to send email',
      details: 'Document build failed',
    });
    errSpy.mockRestore();
    mockBuildInvoiceDocumentPayload.mockImplementation(() => ({ lineItems: [], total: 100 }));
  });
});
