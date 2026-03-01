/**
 * Unit tests for create-client-proposal API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId or clientId missing
 * - Returns 201 with id and proposal when insert succeeds
 * - When linked_contract_id is set, updates that contract's related_proposal_id to the new proposal id
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
});
