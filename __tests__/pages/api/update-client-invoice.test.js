/**
 * Unit tests for update-client-invoice API:
 * - Returns 405 for non-POST/non-PUT
 * - Returns 400 when userId or invoiceId missing
 * - Returns 404 when invoice not found
 * - Returns 200 and updates file_urls, notes, linked_contract_id
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

describe('update-client-invoice API', () => {
  const existingInvoice = {
    id: 'inv-1',
    client_id: 'c1',
    user_id: 'u1',
    organization_id: null,
    invoice_number: 'INV-001',
    invoice_title: 'Test',
    amount: '100',
    tax: '0',
    total: '100',
    status: 'draft',
    payment_method: '',
    outstanding_balance: '100',
    related_proposal_id: null,
    related_project: null,
    linked_contract_id: null,
    notes: null,
    file_url: null,
    file_urls: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    let selectChain = { eq: jest.fn(), limit: jest.fn(), single: jest.fn() };
    selectChain.eq.mockReturnValue(selectChain);
    selectChain.limit.mockReturnValue(selectChain);
    selectChain.single.mockReturnValue(Promise.resolve({ data: existingInvoice, error: null }));

    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({ eq: (...args) => selectChain.eq(...args), limit: () => selectChain.limit(1), single: () => selectChain.single() }),
          update: (updates) => ({
            eq: (col, id) => {
              expect(col).toBe('id');
              expect(id).toBe('inv-1');
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 when method is not POST or PUT', async () => {
    const handler = (await import('@/pages/api/update-client-invoice')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or invoiceId is missing', async () => {
    const handler = (await import('@/pages/api/update-client-invoice')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or invoiceId' });
  });

  it('returns 404 when invoice not found', async () => {
    const notFoundResult = Promise.resolve({ data: null, error: { message: 'not found' } });
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({ eq: () => ({ limit: () => ({ single: () => notFoundResult }) }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-invoice')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
  });

  it('updates file_urls, notes, and linked_contract_id and returns 200', async () => {
    let capturedUpdate;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: existingInvoice, error: null }) }) }),
          }),
          update: (updates) => {
            capturedUpdate = updates;
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-invoice')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        invoiceId: 'inv-1',
        file_urls: ['https://example.com/new.pdf'],
        notes: 'Updated notes',
        linked_contract_id: 'contract-abc',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(capturedUpdate.file_urls).toEqual(['https://example.com/new.pdf']);
    expect(capturedUpdate.file_url).toBe('https://example.com/new.pdf');
    expect(capturedUpdate.notes).toBe('Updated notes');
    expect(capturedUpdate.linked_contract_id).toBe('contract-abc');
  });
});
