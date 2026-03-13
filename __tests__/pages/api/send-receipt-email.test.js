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

jest.mock('@/lib/buildDocumentPayload', () => ({
  buildInvoiceDocumentPayload: jest.fn(() => ({ lineItems: [], total: 100 })),
}));

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
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
    delete process.env.SMTP_HOST;
    delete process.env.RESEND_API_KEY;
    mockSendMail.mockResolvedValue(undefined);
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
    expect(mockSendMail).toHaveBeenCalled();
  });
});
