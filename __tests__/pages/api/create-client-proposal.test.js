/**
 * Unit tests for create-client-proposal API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId or clientId missing
 * - Returns 201 with id and proposal when insert succeeds
 * - When linked_contract_id is set, updates that contract's related_proposal_id to the new proposal id
 */

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));
const mockEnsureAttachmentsFromFiles = jest.fn().mockResolvedValue(undefined);

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));
jest.mock('@/lib/syncFilesToAttachments', () => ({
  ensureAttachmentsFromFiles: (...args) => mockEnsureAttachmentsFromFiles(...args),
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

describe('create-client-proposal API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'new-proposal-id' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'client_contracts') {
        return {
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/create-client-proposal')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or clientId is missing', async () => {
    const handler = (await import('@/pages/api/create-client-proposal')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or clientId' });
  });

  it('returns 201 with id and proposal when insert succeeds', async () => {
    const handler = (await import('@/pages/api/create-client-proposal')).default;
    const req = {
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        proposal_title: 'Test Proposal',
        proposal_number: 'P-001',
        status: 'draft',
      },
    };
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-proposal-id',
        proposal: expect.objectContaining({
          id: 'new-proposal-id',
          client_id: 'c1',
          user_id: 'u1',
          proposal_title: 'Test Proposal',
          status: 'draft',
        }),
      })
    );
  });

  it('updates contract related_proposal_id when linked_contract_id is set', async () => {
    let contractUpdatePayload;
    let contractEqId;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'new-proposal-id' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'client_contracts') {
        return {
          update: (payload) => {
            contractUpdatePayload = payload;
            return {
              eq: (_col, id) => {
                contractEqId = id;
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        proposal_title: 'Linked Proposal',
        proposal_number: 'P-002',
        status: 'draft',
        linked_contract_id: 'contract-xyz',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(contractUpdatePayload).toBeDefined();
    expect(contractUpdatePayload.related_proposal_id).toBe('new-proposal-id');
    expect(contractEqId).toBe('contract-xyz');
  });

  it('returns 503 when Supabase unavailable', async () => {
    const orig = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    jest.resetModules();
    const handler = (await import('@/pages/api/create-client-proposal')).default;
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
      if (table === 'client_proposals') {
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
    const handler = (await import('@/pages/api/create-client-proposal')).default;
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
      if (table === 'client_proposals') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { message: 'insert failed' },
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-proposal')).default;
    const res = mockRes();
    await handler(
      { method: 'POST', body: { userId: 'u1', clientId: 'c1' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create proposal' });
  });

  it('calls ensureAttachmentsFromFiles when file_urls provided', async () => {
    mockEnsureAttachmentsFromFiles.mockResolvedValue(undefined);
    const handler = (await import('@/pages/api/create-client-proposal')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: {
          userId: 'u1',
          clientId: 'c1',
          proposal_title: 'With files',
          file_urls: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'],
        },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockEnsureAttachmentsFromFiles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientId: 'c1',
        userId: 'u1',
        fileUrls: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'],
        linkedProposalId: 'new-proposal-id',
      })
    );
  });

  it('parses file_url (singular) into file_urls', async () => {
    const handler = (await import('@/pages/api/create-client-proposal')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: {
          userId: 'u1',
          clientId: 'c1',
          proposal_title: 'Single file',
          file_url: 'https://example.com/single.pdf',
        },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.proposal.file_urls).toEqual(['https://example.com/single.pdf']);
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
    const handler = (await import('@/pages/api/create-client-proposal')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', organizationId: 'org1' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create contract' });
  });

  it('parses status, line_items, dates, linked_project and linked_contract_id', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          insert: (row) => {
            expect(row.status).toBe('sent');
            expect(row.line_items).toHaveLength(2);
            expect(row.line_items[0]).toMatchObject({
              item_name: 'Item A',
              quantity: 2,
              unit_price: '10.50',
              amount: '21.00',
            });
            expect(row.line_items[1].amount).toBe('99.99');
            expect(row.date_created).toBe('2024-01-15');
            expect(row.date_sent).toBe('2024-01-16');
            expect(row.expiration_date).toBe('2024-02-01');
            expect(row.linked_project).toBe('proj-1');
            expect(row.linked_contract_id).toBe('contract-1');
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'new-id' }, error: null }),
              }),
            };
          },
        };
      }
      if (table === 'client_contracts') {
        return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-proposal')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: {
          userId: 'u1',
          clientId: 'c1',
          status: 'sent',
          proposal_title: 'Full',
          line_items: [
            { item_name: 'Item A', quantity: 2, unit_price: '10.50' },
            { item_name: 'B', description: 'Desc', amount: '99.99' },
          ],
          date_created: '2024-01-15T12:00:00Z',
          date_sent: '2024-01-16',
          expiration_date: '2024-02-01',
          linked_project: 'proj-1',
          linked_contract_id: 'contract-1',
        },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('filters out line_items with no item_name, unit_price, or amount', async () => {
    let insertedRow;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
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
    const handler = (await import('@/pages/api/create-client-proposal')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: {
          userId: 'u1',
          clientId: 'c1',
          line_items: [
            { item_name: 'Keep', unit_price: '1' },
            { item_name: '', description: 'only', unit_price: '', amount: '' },
            { unit_price: '5', amount: '5' },
          ],
        },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(insertedRow.line_items).toHaveLength(2);
    expect(insertedRow.line_items[0].item_name).toBe('Keep');
    expect(insertedRow.line_items[1].unit_price).toBe('5');
  });
});
