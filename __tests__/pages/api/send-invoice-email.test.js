/**
 * Unit tests for send-invoice-email API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId, invoiceId, or to missing; invalid email
 * - Returns 404 when invoice not found
 * - Returns 403 when invoice not owned by user/org
 * - Returns 503 when Supabase or email provider unavailable
 * - On success (first send): updates ever_sent, date_sent, optional payment_token and client_snapshot
 */

const mockSendMail = jest.fn().mockResolvedValue(undefined);
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));

jest.mock('nodemailer', () => ({
  createTransport: (...args) => mockCreateTransport(...args),
}));

jest.mock('@/lib/renderDocumentToHtml', () => ({
  renderDocumentToHtml: jest.fn(() => '<html><body></body></html>'),
}));

jest.mock('@/lib/buildDocumentPayload', () => ({
  buildInvoiceDocumentPayload: jest.fn(() => ({})),
}));

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

const mockResendSend = jest.fn().mockResolvedValue({ data: { id: '1' }, error: null });
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(function () {
    this.emails = { send: mockResendSend };
    return this;
  }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.SMTP_HOST = 'smtp.test.com';
  process.env.SMTP_USER = 'user';
  process.env.SMTP_PASSWORD = 'pass';
  process.env.SMTP_FROM_EMAIL = 'invoices@test.com';
});

function mockRes() {
  return {
    status: jest.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (data) {
      this._json = data;
      return this;
    }),
  };
}

const existingInvoice = {
  id: 'inv-1',
  client_id: 'c1',
  user_id: 'u1',
  organization_id: null,
  invoice_title: 'Test Invoice',
  invoice_number: 'INV-001',
  status: 'draft',
  payment_token: null,
  ever_sent: false,
  date_sent: null,
};

function setupSupabaseSuccess(invoice = existingInvoice) {
  const updateMock = jest.fn().mockReturnValue(Promise.resolve({ error: null }));
  mockFrom.mockImplementation((table) => {
    if (table === 'client_invoices') {
      return {
        select: () => ({
          eq: (col, val) => ({
            limit: () => ({
              single: () => Promise.resolve({ data: invoice, error: null }),
            }),
          }),
        }),
        update: (payload) => ({
          eq: (col, id) => {
            if (col === 'id' && id === invoice.id) updateMock(payload);
            return Promise.resolve({ error: null });
          },
        }),
      };
    }
    if (table === 'user_profiles') {
      return {
        select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: { company_name: 'Co' }, error: null }) }) }) }),
      };
    }
    if (table === 'organizations') {
      return {
        select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
      };
    }
    return {};
  });
  return updateMock;
}

describe('send-invoice-email API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue(undefined);
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId, invoiceId, or to is missing', async () => {
    setupSupabaseSuccess();
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();

    await handler({ method: 'POST', body: { userId: 'u1', invoiceId: 'inv-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId, invoiceId, or to (client email)' });

    await handler({ method: 'POST', body: { userId: 'u1', to: 'a@b.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for invalid email address', async () => {
    setupSupabaseSuccess();
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'not-an-email' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email address' });
  });

  it('returns 404 when invoice not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
  });

  it('returns 403 when invoice does not belong to user (no org)', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({
                  data: { ...existingInvoice, organization_id: null, user_id: 'other-user' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice does not belong to you' });
  });

  it('returns 200 and updates invoice when not reminder (ever_sent, date_sent)', async () => {
    const updateMock = setupSupabaseSuccess();
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        invoiceId: 'inv-1',
        to: 'client@example.com',
        clientName: 'Acme',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true, message: 'Invoice email sent' });
    expect(mockSendMail).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalled();
    const updatePayload = updateMock.mock.calls[0][0];
    expect(updatePayload.ever_sent).toBe(true);
    expect(updatePayload.date_sent).toBeDefined();
    expect(updatePayload.updated_at).toBeDefined();
  });

  it('returns 200 with "Reminder sent" when isReminder is true and does not update invoice', async () => {
    const updateMock = setupSupabaseSuccess();
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        invoiceId: 'inv-1',
        to: 'client@example.com',
        isReminder: true,
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true, message: 'Reminder sent' });
    expect(mockSendMail).toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('returns 503 when Supabase is not available', async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    jest.resetModules();
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    jest.resetModules();
  });

  it('returns 403 when organizationId is provided but invoice belongs to different org', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({
                  data: { ...existingInvoice, organization_id: 'other-org', user_id: 'u1' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', invoiceId: 'inv-1', to: 'client@example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice does not belong to this organization' });
  });

  it('returns 403 when organizationId is provided but user is not org member', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({
                  data: { ...existingInvoice, organization_id: 'org-1', user_id: 'u1' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'org_members') {
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
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', invoiceId: 'inv-1', to: 'client@example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 200 when organizationId provided, user is member, and org data used', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({
                  data: { ...existingInvoice, organization_id: 'org-1', user_id: 'u1' },
                  error: null,
                }),
              }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'org_members') {
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
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: { company_name: 'User Co' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({
                  data: {
                    name: 'Org Name',
                    logo_url: 'https://logo.url',
                    address_line_1: '123 Org St',
                    address_line_2: 'Suite 1',
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
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', invoiceId: 'inv-1', to: 'client@example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true, message: 'Invoice email sent' });
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('includes client snapshot from profile.clients when invoice has client_id', async () => {
    const updateMock = jest.fn().mockReturnValue(Promise.resolve({ error: null }));
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({
                  data: { ...existingInvoice, client_id: 'c1' },
                  error: null,
                }),
              }),
            }),
          }),
          update: (p) => {
            updateMock(p);
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({
                  data: {
                    company_name: 'Co',
                    clients: [
                      {
                        id: 'c1',
                        name: 'Client Name',
                        billingAddress: { address1: '123 Bill St', address2: 'Apt 2' },
                      },
                    ],
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(updateMock).toHaveBeenCalled();
    const payload = updateMock.mock.calls[0][0];
    expect(payload.client_snapshot).toBeDefined();
    expect(payload.client_snapshot.name).toBe('Client Name');
    expect(payload.client_snapshot.addressLines).toEqual(['123 Bill St', 'Apt 2']);
  });

  it('returns 503 when no email provider configured', async () => {
    const origHost = process.env.SMTP_HOST;
    const origResend = process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.RESEND_API_KEY;
    setupSupabaseSuccess();
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'No email provider configured',
        message: expect.stringContaining('SMTP_* or RESEND_API_KEY'),
      })
    );
    process.env.SMTP_HOST = origHost;
    process.env.RESEND_API_KEY = origResend;
  });

  it('sends via Resend when RESEND_API_KEY set and SMTP not used', async () => {
    const origHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;
    process.env.RESEND_API_KEY = 're_xxx';
    setupSupabaseSuccess();
    const handler = (await import('@/pages/api/send-invoice-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', to: 'client@example.com' },
    }, res);
    process.env.SMTP_HOST = origHost;
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true, message: 'Invoice email sent' });
    expect(mockResendSend).toHaveBeenCalled();
  });
});
