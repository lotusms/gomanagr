/**
 * Unit tests for get-contracts API.
 * POST only; 503, 400 (missing userId), 403 not org member, 500 on query error,
 * 200 with contracts list, 200 with single contract (and related_proposal), 404 when contractId not found.
 */

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return {
    status: jest.fn(function (c) {
      this.statusCode = c;
      return this;
    }),
    json: jest.fn(function (d) {
      this._json = d;
      return this;
    }),
  };
}

function makeListChain(result) {
  const chain = {
    eq: () => chain,
    is: () => chain,
    order: () => chain,
    limit: () => chain,
    then: (resolve) => resolve(result),
  };
  return chain;
}

function makeSingleChain(maybeSingleResult) {
  const chain = {
    eq: () => chain,
    is: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve(maybeSingleResult),
  };
  return chain;
}

describe('get-contracts API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'client_contracts') {
        const listResult = {
          data: [{ id: 'c1', client_id: 'client-1', user_id: 'u1', organization_id: null }],
          error: null,
        };
        const chain = makeListChain(listResult);
        return { select: () => chain };
      }
      if (t === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'prop-1', proposal_number: 'P-001', proposal_title: 'Proposal' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-contracts')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-contracts')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/get-contracts')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 403 when organizationId provided and user not a member', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-contracts')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 500 when list query errors', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_contracts') {
        const chain = makeListChain({ data: null, error: { message: 'db error' } });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-contracts')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load contracts' });
  });

  it('returns 200 with contracts list when no contractId', async () => {
    const handler = (await import('@/pages/api/get-contracts')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ contracts: expect.any(Array) })
    );
    expect(res.json.mock.calls[0][0].contracts).toHaveLength(1);
    expect(res.json.mock.calls[0][0].contracts[0].user_id).toBe('u1');
  });

  it('returns 200 with single contract when contractId provided', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_contracts') {
        const chain = makeSingleChain({
          data: {
            id: 'contract-1',
            client_id: 'client-1',
            user_id: 'u1',
            organization_id: null,
            related_proposal_id: 'prop-1',
          },
          error: null,
        });
        return { select: () => chain };
      }
      if (t === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'prop-1', proposal_number: 'P-001', proposal_title: 'Proposal' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-contracts')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', contractId: 'contract-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        contract: expect.objectContaining({
          id: 'contract-1',
          related_proposal_id: 'prop-1',
          related_proposal: { id: 'prop-1', proposal_number: 'P-001', proposal_title: 'Proposal' },
        }),
      })
    );
  });

  it('returns 404 when contractId provided but no contract found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_contracts') {
        const chain = makeSingleChain({ data: null, error: null });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-contracts')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', contractId: 'nonexistent' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Contract not found' });
  });

  it('returns 500 when single contract query errors', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_contracts') {
        const chain = makeSingleChain({ data: null, error: { message: 'db error' } });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-contracts')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', contractId: 'contract-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load contract' });
  });

  it('returns 200 with contracts when organizationId and member', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'client_contracts') {
        const chain = makeListChain({
          data: [{ id: 'c1', client_id: 'client-1', organization_id: 'org-1' }],
          error: null,
        });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-contracts')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].contracts).toHaveLength(1);
    expect(res.json.mock.calls[0][0].contracts[0].organization_id).toBe('org-1');
  });
});
