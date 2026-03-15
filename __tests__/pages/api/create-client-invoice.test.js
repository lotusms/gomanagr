/**
 * Unit tests for create-client-invoice API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId or clientId missing
 * - Returns 201 with id and invoice when insert succeeds
 * - Accepts file_urls array, terms, scope_summary, and linked_contract_id
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

  it('accepts file_urls array, terms, scope_summary, and linked_contract_id', async () => {
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
        terms: 'Payment terms: Net 30',
        scope_summary: 'Web design scope',
        linked_contract_id: 'contract-xyz',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const call = res.json.mock.calls[0][0];
    expect(call.invoice.file_urls).toEqual(['https://example.com/a.pdf', 'https://example.com/b.pdf']);
    expect(call.invoice.terms).toBe('Payment terms: Net 30');
    expect(call.invoice.scope_summary).toBe('Web design scope');
    expect(call.invoice.linked_contract_id).toBe('contract-xyz');
    expect(call.invoice.file_url).toBe('https://example.com/a.pdf');
  });

  it('returns 503 when Supabase unavailable', async () => {
    const orig = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    jest.resetModules();
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler(
      { method: 'POST', body: { userId: 'u1', clientId: 'c1' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = orig;
    jest.resetModules();
  });

  it('returns 403 when organizationId set but user not a member', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'client_invoices') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'new-id' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', organizationId: 'org1' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 500 when insert returns error', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { message: 'duplicate key' },
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler(
      { method: 'POST', body: { userId: 'u1', clientId: 'c1' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'duplicate key' });
  });

  it('calls ensureAttachmentsFromFiles when file_urls provided', async () => {
    const { ensureAttachmentsFromFiles } = await import('@/lib/syncFilesToAttachments');
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        invoice_title: 'With files',
        file_urls: ['https://example.com/file.pdf'],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(ensureAttachmentsFromFiles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientId: 'c1',
        userId: 'u1',
        fileUrls: ['https://example.com/file.pdf'],
        linkedInvoiceId: 'new-invoice-id',
      })
    );
  });

  it('returns 500 when handler throws', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.reject(new Error('connection lost')),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', organizationId: 'org1' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create invoice' });
  });

  it('computes subtotal and total from line_items when provided', async () => {
    let insertedRow;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          insert: (row) => {
            insertedRow = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'new-id' }, error: null }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        invoice_number: 'INV-003',
        line_items: [
          { item_name: 'A', amount: '10.00' },
          { item_name: 'B', amount: '20.00' },
        ],
        tax: '2.50',
        discount: '1.00',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(insertedRow.amount).toBe('30.00');
    expect(insertedRow.total).toBe('31.50');
    expect(insertedRow.tax).toBe('2.50');
    expect(insertedRow.discount).toBe('1.00');
  });

  it('parses file_url (singular), status, dates, payment_terms, related_proposal_id, ever_sent', async () => {
    let insertedRow;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          insert: (row) => {
            insertedRow = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'new-id' }, error: null }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        status: 'sent',
        file_url: 'https://example.com/single.pdf',
        date_issued: '2024-01-15T00:00:00Z',
        due_date: '2024-02-15',
        payment_terms: 'Net 30',
        related_proposal_id: 'prop-1',
        related_project: 'proj-1',
        ever_sent: true,
        date_sent: '2024-01-10',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(insertedRow.status).toBe('sent');
    expect(insertedRow.file_urls).toEqual(['https://example.com/single.pdf']);
    expect(insertedRow.date_issued).toBe('2024-01-15');
    expect(insertedRow.due_date).toBe('2024-02-15');
    expect(insertedRow.payment_terms).toBe('Net 30');
    expect(insertedRow.related_proposal_id).toBe('prop-1');
    expect(insertedRow.related_project).toBe('proj-1');
    expect(insertedRow.ever_sent).toBe(true);
    expect(insertedRow.date_sent).toBe('2024-01-10');
  });

  it('normalizes line_items with quantity and unit_price for amount', async () => {
    let insertedRow;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          insert: (row) => {
            insertedRow = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'new-id' }, error: null }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        line_items: [
          { item_name: 'Item', quantity: 3, unit_price: '10.50' },
          { item_name: 'Other', description: 'Desc', amount: '99.99' },
        ],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(insertedRow.line_items).toHaveLength(2);
    expect(insertedRow.line_items[0].quantity).toBe(3);
    expect(insertedRow.line_items[0].unit_price).toBe('10.50');
    expect(insertedRow.line_items[0].amount).toBe('31.50');
    expect(insertedRow.line_items[1].amount).toBe('99.99');
  });

  it('filters out line_items with no item_name, unit_price, or amount', async () => {
    let insertedRow;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          insert: (row) => {
            insertedRow = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'new-id' }, error: null }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-invoice')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        line_items: [
          { item_name: 'Keep', unit_price: '5' },
          { item_name: '', description: 'only', unit_price: '', amount: '' },
        ],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(insertedRow.line_items).toHaveLength(1);
    expect(insertedRow.line_items[0].item_name).toBe('Keep');
  });
});
