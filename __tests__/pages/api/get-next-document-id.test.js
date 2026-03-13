/**
 * Unit tests for get-next-document-id API.
 * POST only; 503, 400 (missing userId/prefix, unsupported prefix, orgOnly without org),
 * 403 not org member, 500 on query error, 200 with suggestedId (user and org scope).
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

function makeQueryChain(result) {
  const chain = {
    eq: () => chain,
    is: () => chain,
    then: (resolve) => resolve(result),
  };
  return chain;
}

describe('get-next-document-id API', () => {
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
      if (t === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id_prefix: 'ORG', name: 'Test Org' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (t === 'client_proposals') {
        const chain = makeQueryChain({
          data: [{ proposal_number: 'PER-PROP-20250301-003' }],
          error: null,
        });
        return { select: () => chain };
      }
      if (t === 'client_invoices') {
        const chain = makeQueryChain({ data: [], error: null });
        return { select: () => chain };
      }
      if (t === 'client_contracts') {
        const chain = makeQueryChain({ data: [], error: null });
        return { select: () => chain };
      }
      if (t === 'client_projects') {
        const chain = makeQueryChain({ data: [], error: null });
        return { select: () => chain };
      }
      if (t === 'tasks') {
        const chain = makeQueryChain({ data: [], error: null });
        return { select: () => chain };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-next-document-id')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-next-document-id')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', prefix: 'PROP' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/get-next-document-id')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { prefix: 'PROP' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or prefix' });
  });

  it('returns 400 when prefix missing', async () => {
    const handler = (await import('@/pages/api/get-next-document-id')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or prefix' });
  });

  it('returns 400 for unsupported prefix', async () => {
    const handler = (await import('@/pages/api/get-next-document-id')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', prefix: 'INVALID' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unsupported prefix: INVALID' });
  });

  it('returns 400 for TASK prefix without organizationId', async () => {
    const handler = (await import('@/pages/api/get-next-document-id')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', prefix: 'TASK' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'organizationId is required for this document type',
    });
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
    const handler = (await import('@/pages/api/get-next-document-id')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', prefix: 'PROP' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 500 when table query errors', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_proposals') {
        const chain = makeQueryChain({ data: null, error: { message: 'db error' } });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-next-document-id')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', prefix: 'PROP' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to compute next ID' });
  });

  it('returns 200 with suggestedId for user scope (PROP)', async () => {
    const handler = (await import('@/pages/api/get-next-document-id')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', prefix: 'PROP' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedId: expect.stringMatching(/^PER-PROP-\d{8}-004$/),
        orgPrefix: 'PER',
      })
    );
  });

  it('returns 200 with suggestedId for org scope and org prefix', async () => {
    const handler = (await import('@/pages/api/get-next-document-id')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', prefix: 'INV', date: '2025-03-13' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedId: expect.stringMatching(/^ORG-INV-20250313-001$/),
        orgPrefix: 'ORG',
      })
    );
  });

  it('returns 200 for TASK with organizationId', async () => {
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
      if (t === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id_prefix: 'ORG', name: 'Test Org' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (t === 'tasks') {
        const chain = makeQueryChain({ data: [], error: null });
        return { select: () => chain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-next-document-id')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', prefix: 'TASK' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].suggestedId).toMatch(/^ORG-TASK-\d{8}-001$/);
    expect(res.json.mock.calls[0][0].orgPrefix).toBe('ORG');
  });
});
