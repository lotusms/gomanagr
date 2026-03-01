/**
 * Unit tests for create-client-invoice API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId or clientId missing
 * - Returns 201 with id and invoice when insert succeeds
 * - Accepts file_urls array, notes, and linked_contract_id
 */

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

jest.mock('@/lib/syncFilesToAttachments', () => ({
  ensureAttachmentsFromFiles: jest.fn().mockResolvedValue(undefined),
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

describe('create-client-invoice API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'new-invoice-id' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or clientId is missing', async () => {
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or clientId' });
  });

  it('returns 201 with id and invoice when insert succeeds', async () => {
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const req = {
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        invoice_number: 'INV-001',
        invoice_title: 'Test Invoice',
        status: 'draft',
      },
    };
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-invoice-id',
        invoice: expect.objectContaining({
          id: 'new-invoice-id',
          client_id: 'c1',
          user_id: 'u1',
          invoice_number: 'INV-001',
          invoice_title: 'Test Invoice',
          status: 'draft',
        }),
      })
    );
  });

  it('accepts file_urls array, notes, and linked_contract_id', async () => {
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        invoice_number: 'INV-002',
        invoice_title: 'Invoice with files',
        status: 'draft',
        file_urls: ['https://example.com/a.pdf', 'https://example.com/b.pdf'],
        notes: 'Payment terms: Net 30',
        linked_contract_id: 'contract-xyz',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const call = res.json.mock.calls[0][0];
    expect(call.invoice.file_urls).toEqual(['https://example.com/a.pdf', 'https://example.com/b.pdf']);
    expect(call.invoice.notes).toBe('Payment terms: Net 30');
    expect(call.invoice.linked_contract_id).toBe('contract-xyz');
    expect(call.invoice.file_url).toBe('https://example.com/a.pdf');
  });
});
