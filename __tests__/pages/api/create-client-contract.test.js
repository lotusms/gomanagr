/**
 * Unit tests for create-client-contract API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId or clientId missing
 * - Returns 201 with id and contract when insert succeeds
 * - Accepts and persists related_proposal_id when provided
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
});
