/**
 * Unit tests for get-proposals API.
 * POST only; 503, 400, 403, 500, 200 list, 200 single proposal (line_items normalized), 404.
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

describe('get-proposals API', () => {
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
      if (t === 'client_proposals') {
        const listResult = {
          data: [{ id: 'prop1', user_id: 'u1', organization_id: null }],
          error: null,
        };
        return { select: () => makeListChain(listResult) };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-proposals')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-proposals')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/get-proposals')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 403 when organizationId and not a member', async () => {
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
    const handler = (await import('@/pages/api/get-proposals')).default;
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
      if (t === 'client_proposals') {
        return { select: () => makeListChain({ data: null, error: { message: 'db error' } }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-proposals')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load proposals' });
  });

  it('returns 200 with proposals list', async () => {
    const handler = (await import('@/pages/api/get-proposals')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ proposals: expect.any(Array) })
    );
    expect(res.json.mock.calls[0][0].proposals[0].user_id).toBe('u1');
  });

  it('returns 200 with single proposal and normalizes line_items', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_proposals') {
        return {
          select: () =>
            makeSingleChain({
              data: { id: 'prop-1', user_id: 'u1', line_items: null },
              error: null,
            }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-proposals')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'prop-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      proposal: expect.objectContaining({
        id: 'prop-1',
        line_items: [],
      }),
    });
  });

  it('returns 404 when proposalId not found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_proposals') {
        return { select: () => makeSingleChain({ data: null, error: null }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-proposals')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'nonexistent' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Proposal not found' });
  });

  it('returns 500 when single proposal query errors', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_proposals') {
        return {
          select: () =>
            makeSingleChain({ data: null, error: { message: 'db error' } }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-proposals')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'prop-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load proposal' });
  });
});
