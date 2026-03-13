/**
 * Unit tests for get-tasks API.
 * POST only; 503, 400 (userId and organizationId required), 403, 500/404 single, 200 single task, 200 list with taskActivity and taskComments.
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

function makeTasksChain(listResult, singleResult) {
  const chain = {
    eq: () => chain,
    or: () => chain,
    lt: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve(singleResult != null ? singleResult : { data: null, error: null }),
    then: (resolve) => resolve(listResult != null ? listResult : { data: [], error: null }),
  };
  return chain;
}

describe('get-tasks API', () => {
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
      if (t === 'tasks') {
        return {
          select: () =>
            makeTasksChain(
              { data: [{ id: 't1', title: 'Task 1', organization_id: 'org-1' }], error: null },
              null
            ),
        };
      }
      if (t === 'task_activity') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  then: (resolve) =>
                    resolve({ data: [{ id: 'act1' }], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'task_comments') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                then: (resolve) =>
                  resolve({ data: [{ id: 'com1' }], error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/get-tasks')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-tasks')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/get-tasks')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { organizationId: 'org-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 400 when organizationId missing', async () => {
    const handler = (await import('@/pages/api/get-tasks')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing organizationId' });
  });

  it('returns 403 when not a member of organization', async () => {
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
    const handler = (await import('@/pages/api/get-tasks')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 200 with single task when taskId provided', async () => {
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
      if (t === 'tasks') {
        return {
          select: () =>
            makeTasksChain(null, {
              data: { id: 'task-1', title: 'Single Task', organization_id: 'org-1' },
              error: null,
            }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-tasks')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: 'task-1', title: 'Single Task' }),
    });
  });

  it('returns 404 when taskId not found', async () => {
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
      if (t === 'tasks') {
        return {
          select: () =>
            makeTasksChain(null, { data: null, error: null }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-tasks')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'nonexistent' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Task not found' });
  });

  it('returns 500 when single task query errors', async () => {
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
      if (t === 'tasks') {
        return {
          select: () =>
            makeTasksChain(null, { data: null, error: { message: 'db error' } }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-tasks')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load task' });
  });

  it('returns 200 with tasks, taskActivity, and taskComments when no taskId', async () => {
    const handler = (await import('@/pages/api/get-tasks')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      tasks: expect.any(Array),
      taskActivity: expect.any(Array),
      taskComments: expect.any(Array),
    });
    expect(res.json.mock.calls[0][0].tasks).toHaveLength(1);
    expect(res.json.mock.calls[0][0].tasks[0].id).toBe('t1');
    expect(res.json.mock.calls[0][0].taskActivity).toHaveLength(1);
    expect(res.json.mock.calls[0][0].taskComments).toHaveLength(1);
  });
});
