/**
 * Unit tests for update-client-contract API:
 * - Returns 405 for non-POST/PUT
 * - Returns 400 when userId or contractId missing
 * - Returns 404 when contract not found
 * - Returns 200 when update succeeds
 * - Updates related_proposal_id when provided
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

const existingContract = {
  id: 'contract-1',
  client_id: 'c1',
  user_id: 'u1',
  organization_id: null,
  contract_title: 'Original',
  contract_number: 'CON-001',
  status: 'draft',
  related_proposal_id: null,
};

describe('update-client-contract API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'client_contracts') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: existingContract, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 when method is not POST or PUT', async () => {
    const handler = (await import('@/pages/api/update-client-contract')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: { userId: 'u1', contractId: 'contract-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or contractId is missing', async () => {
    const handler = (await import('@/pages/api/update-client-contract')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or contractId' });
  });

  it('returns 404 when contract not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_contracts') {
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
    const handler = (await import('@/pages/api/update-client-contract')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', contractId: 'nonexistent', contract_title: 'Updated' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Contract not found' });
  });

  it('returns 200 when update succeeds', async () => {
    const handler = (await import('@/pages/api/update-client-contract')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', contractId: 'contract-1', contract_title: 'Updated Title' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('updates related_proposal_id when provided', async () => {
    let updatePayload;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_contracts') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: existingContract, error: null }),
              }),
            }),
          }),
          update: (updates) => {
            updatePayload = updates;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-contract')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', contractId: 'contract-1', related_proposal_id: 'proposal-abc' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(updatePayload.related_proposal_id).toBe('proposal-abc');
  });
});
