/**
 * Unit tests for get-invoice-payments API.
 */

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mockFrom }) }));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return {
    status: jest.fn(function (c) { this.statusCode = c; return this; }),
    setHeader: jest.fn(),
    json: jest.fn(function (d) { this._json = d; return this; }),
  };
}

function clientInvoicesMock() {
  const p = Promise.resolve({ data: { id: 'inv-1' }, error: null });
  return {
    select: () => ({
      eq: () => ({
        limit: () => ({ eq: () => ({ is: () => ({ maybeSingle: () => p }) }), maybeSingle: () => p }),
      }),
    }),
  };
}

function invoicePaymentsMock() {
  const p = Promise.resolve({
    data: [{ id: 'pay-1', invoice_id: 'inv-1', amount_cents: 1000, paid_at: '2026-01-01' }],
    error: null,
  });
  return { select: () => ({ eq: () => ({ order: () => p }) }) };
}

describe('get-invoice-payments API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') return clientInvoicesMock();
      if (table === 'invoice_payments') return invoicePaymentsMock();
      if (table === 'org_members') {
        return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }) }) }) }) }) };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-invoice-payments')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-invoice-payments')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', invoiceId: 'inv-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or invoiceId missing', async () => {
    const handler = (await import('@/pages/api/get-invoice-payments')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or invoiceId' });
  });

  it('returns 200 with payments array', async () => {
    const handler = (await import('@/pages/api/get-invoice-payments')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', invoiceId: 'inv-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ payments: expect.any(Array) });
    expect(res.json.mock.calls[0][0].payments).toHaveLength(1);
    expect(res.json.mock.calls[0][0].payments[0].amount_cents).toBe(1000);
  });
});
