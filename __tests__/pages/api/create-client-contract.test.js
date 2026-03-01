/**
 * Unit tests for create-client-contract API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId or clientId missing
 * - Returns 201 with id and contract when insert succeeds
 * - Accepts and persists related_proposal_id when provided
 * - When related_proposal_id is set, updates that proposal's linked_contract_id to the new contract id
 * - Creating a contract with a proposal chosen from the dropdown automatically links and saves the proposal (bidirectional link)
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

describe('create-client-contract API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'client_contracts') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'new-contract-id' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'client_proposals') {
        return {
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'org_members') {
        return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }) }) };
      }
      return {};
    });
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/create-client-contract')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or clientId is missing', async () => {
    const handler = (await import('@/pages/api/create-client-contract')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or clientId' });
  });

  it('returns 201 with id and contract when insert succeeds', async () => {
    const handler = (await import('@/pages/api/create-client-contract')).default;
    const req = {
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        contract_title: 'Service Agreement',
        contract_number: 'CON-001',
        status: 'draft',
      },
    };
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-contract-id',
        contract: expect.objectContaining({
          id: 'new-contract-id',
          client_id: 'c1',
          user_id: 'u1',
          contract_title: 'Service Agreement',
          contract_number: 'CON-001',
          status: 'draft',
        }),
      })
    );
  });

  it('persists related_proposal_id when provided', async () => {
    const handler = (await import('@/pages/api/create-client-contract')).default;
    const req = {
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        contract_title: 'Linked Contract',
        contract_number: 'CON-002',
        status: 'draft',
        related_proposal_id: 'proposal-uuid-123',
      },
    };
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const call = res.json.mock.calls[0][0];
    expect(call.contract.related_proposal_id).toBe('proposal-uuid-123');
  });

  it('updates proposal linked_contract_id when related_proposal_id is set', async () => {
    let proposalUpdatePayload;
    let proposalEqId;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_contracts') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'new-contract-id' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'client_proposals') {
        return {
          update: (payload) => {
            proposalUpdatePayload = payload;
            return {
              eq: (_col, id) => {
                proposalEqId = id;
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      if (table === 'org_members') {
        return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }) }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-contract')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        contract_title: 'Contract',
        contract_number: 'CON-003',
        status: 'draft',
        related_proposal_id: 'proposal-abc',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(proposalUpdatePayload).toBeDefined();
    expect(proposalUpdatePayload.linked_contract_id).toBe('new-contract-id');
    expect(proposalEqId).toBe('proposal-abc');
  });

  it('when creating a contract with a proposal chosen from dropdown, automatically links and saves the proposal', async () => {
    const handler = (await import('@/pages/api/create-client-contract')).default;
    let proposalUpdatedWithContractId;
    let proposalIdUpdated;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_contracts') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'contract-new-123' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'client_proposals') {
        return {
          update: (payload) => {
            proposalUpdatedWithContractId = payload.linked_contract_id;
            return {
              eq: (_col, id) => {
                proposalIdUpdated = id;
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      if (table === 'org_members') {
        return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }) }) };
      }
      return {};
    });
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        contract_title: 'Service Agreement',
        contract_number: 'CON-004',
        status: 'draft',
        related_proposal_id: 'proposal-existing-456',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'contract-new-123',
        contract: expect.objectContaining({
          id: 'contract-new-123',
          related_proposal_id: 'proposal-existing-456',
        }),
      })
    );
    expect(proposalUpdatedWithContractId).toBe('contract-new-123');
    expect(proposalIdUpdated).toBe('proposal-existing-456');
  });
});
