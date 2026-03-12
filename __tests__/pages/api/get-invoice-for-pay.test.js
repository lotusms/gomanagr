/**
 * Unit tests for get-invoice-for-pay API (public pay page):
 * - GET only; 400 when invoiceId or token missing
 * - 404 when invoice not found
 * - 403 when token does not match
 * - 400 when invoice is void
 * - 200 with invoice, amountDue, alreadyPaid when valid
 */

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
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

const invoiceRow = {
  id: 'inv-1',
  invoice_title: 'Test Invoice',
  invoice_number: 'INV-001',
  total: '150.00',
  outstanding_balance: '',
  status: 'sent',
  payment_token: 'valid-token',
  line_items: [{ item_name: 'Item 1', amount: '150.00' }],
  tax: '0',
  discount: '0',
  date_issued: '2025-01-01',
  due_date: '2025-01-31',
  client_id: 'c1',
  user_id: 'u1',
  organization_id: null,
  client_snapshot: null,
};

function setupSupabaseSuccess(invoice = invoiceRow) {
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
      };
    }
    if (table === 'user_profiles') {
      return {
        select: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: { company_name: 'Co', profile: {}, clients: [] }, error: null }),
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
}

describe('get-invoice-for-pay API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 when method is not GET', async () => {
    const handler = (await import('@/pages/api/get-invoice-for-pay')).default;
    const res = mockRes();
    await handler({ method: 'POST', query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when invoiceId or token missing', async () => {
    const handler = (await import('@/pages/api/get-invoice-for-pay')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing invoiceId or token' });

    await handler({ method: 'GET', query: { invoiceId: 'inv-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when invoice not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-invoice-for-pay')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
  });

  it('returns 403 when token does not match', async () => {
    setupSupabaseSuccess(invoiceRow);
    const handler = (await import('@/pages/api/get-invoice-for-pay')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'wrong-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid link' });
  });

  it('returns 400 when invoice is void', async () => {
    setupSupabaseSuccess({ ...invoiceRow, status: 'void' });
    const handler = (await import('@/pages/api/get-invoice-for-pay')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'This invoice is void' });
  });

  it('returns 200 with invoice, amountDue and alreadyPaid when valid', async () => {
    setupSupabaseSuccess(invoiceRow);
    const handler = (await import('@/pages/api/get-invoice-for-pay')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body.ok).toBe(true);
    expect(body.invoice).toBeDefined();
    expect(body.invoice.id).toBe('inv-1');
    expect(body.invoice.total).toBe(150);
    expect(body.invoice.amountDue).toBe(150);
    expect(body.invoice.alreadyPaid).toBe(false);
  });

  it('returns 200 with alreadyPaid true when outstanding_balance is 0', async () => {
    setupSupabaseSuccess({ ...invoiceRow, outstanding_balance: '0' });
    const handler = (await import('@/pages/api/get-invoice-for-pay')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.invoice.alreadyPaid).toBe(true);
    expect(body.invoice.amountDue).toBe(0);
  });
});
