/**
 * Unit tests for delete-task API.
 * POST only; 503, 400 (userId, organizationId, taskId), 403 not member, 500, 200.
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

describe('delete-task API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const chain = { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }) }) }) }) }) };
        return chain;
      }
      if (t === 'tasks') {
        const delChain = { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        return { delete: () => delChain };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/delete-task')).default;
    const res = mockRes();
    await handler({ method: 'DELETE', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/delete-task')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId, organizationId, or taskId missing', async () => {
    const handler = (await import('@/pages/api/delete-task')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId, organizationId, or taskId' });
  });

  it('returns 403 when not a member of organization', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }) }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/delete-task')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 500 when delete fails', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }) }) }) }) }) };
      }
      if (t === 'tasks') {
        return { delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: { message: 'delete failed' } }) }) }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/delete-task')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete task' });
  });

  it('returns 200 when delete succeeds', async () => {
    const handler = (await import('@/pages/api/delete-task')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
