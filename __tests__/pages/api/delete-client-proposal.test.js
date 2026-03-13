/**
 * Unit tests for delete-client-proposal API.
 * POST/DELETE; 503, 400, 404, 403 (org/personal), 500, 200.
 */

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mockFrom }) }));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return { status: jest.fn(function (c) { this.statusCode = c; return this; }), json: jest.fn(function (d) { this._json = d; return this; }) };
}

describe('delete-client-proposal API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((t) => {
      if (t === 'client_proposals') {
        const selectChain = { eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: { id: 'prop-1', user_id: 'u1', organization_id: null }, error: null }) }) }) };
        const deleteChain = { eq: () => Promise.resolve({ error: null }) };
        return { select: () => selectChain, delete: () => deleteChain };
      }
      if (t === 'org_members') {
        return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }) }) }) }) }) };
      }
      return {};
    });
  });

  it('returns 405 for unsupported method', async () => {
    const handler = (await import('@/pages/api/delete-client-proposal')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/delete-client-proposal')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', proposalId: 'prop-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or proposalId missing', async () => {
    const handler = (await import('@/pages/api/delete-client-proposal')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or proposalId' });
  });

  it('returns 404 when proposal not found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_proposals') {
        return { select: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }) }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/delete-client-proposal')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', proposalId: 'prop-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Proposal not found' });
  });

  it('returns 403 when proposal does not belong to user', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_proposals') {
        return { select: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: { id: 'prop-1', user_id: 'other', organization_id: null }, error: null }) }) }) }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/delete-client-proposal')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', proposalId: 'prop-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Proposal does not belong to you' });
  });

  it('returns 500 when delete fails', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_proposals') {
        const selectChain = { eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: { id: 'prop-1', user_id: 'u1', organization_id: null }, error: null }) }) }) };
        const deleteChain = { eq: () => Promise.resolve({ error: { message: 'delete failed' } }) };
        return { select: () => selectChain, delete: () => deleteChain };
      }
      return {};
    });
    const handler = (await import('@/pages/api/delete-client-proposal')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', proposalId: 'prop-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete proposal' });
  });

  it('returns 200 when delete succeeds', async () => {
    const handler = (await import('@/pages/api/delete-client-proposal')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', proposalId: 'prop-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
