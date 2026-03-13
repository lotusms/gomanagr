/**
 * Unit tests for add-task-comment API:
 * - POST only; 405 for other methods
 * - 503 when Supabase unavailable
 * - 400 missing userId, organizationId, or taskId
 * - 400 invalid userId
 * - 400 comment body empty
 * - 403 not a member of organization
 * - 500 when insert fails
 * - 200 and returns comment when success
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

const validUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('add-task-comment API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'task_comments') {
        return {
          insert: (row) => ({
            select: () => ({
              single: () => Promise.resolve({
                data: { id: 'comment-1', ...row },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/add-task-comment')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/add-task-comment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: validUuid, organizationId: 'org-1', taskId: 'task-1', body: 'Hello' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId, organizationId, or taskId missing', async () => {
    const handler = (await import('@/pages/api/add-task-comment')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId, organizationId, or taskId' });

    await handler({ method: 'POST', body: { userId: validUuid } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    await handler({ method: 'POST', body: { organizationId: 'org-1', taskId: 't1', body: 'x' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when userId is invalid', async () => {
    const handler = (await import('@/pages/api/add-task-comment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'not-a-uuid', organizationId: 'org-1', taskId: 'task-1', body: 'Hello' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid userId' });
  });

  it('accepts owner- and auth- prefixed UUIDs', async () => {
    const handler = (await import('@/pages/api/add-task-comment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: `owner-${validUuid}`, organizationId: 'org-1', taskId: 'task-1', body: 'Hello' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 when comment body is empty', async () => {
    const handler = (await import('@/pages/api/add-task-comment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: validUuid, organizationId: 'org-1', taskId: 'task-1', body: '' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Comment body is required' });

    await handler({
      method: 'POST',
      body: { userId: validUuid, organizationId: 'org-1', taskId: 'task-1', body: '   ' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when user is not a member of the organization', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
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
    const handler = (await import('@/pages/api/add-task-comment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: validUuid, organizationId: 'org-1', taskId: 'task-1', body: 'Hello' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 500 when insert fails', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'task_comments') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'insert failed' } }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/add-task-comment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: validUuid, organizationId: 'org-1', taskId: 'task-1', body: 'Hello' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to add comment' });
  });

  it('returns 200 and comment when success', async () => {
    const handler = (await import('@/pages/api/add-task-comment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: validUuid, organizationId: 'org-1', taskId: 'task-1', body: 'Hello world' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        comment: expect.objectContaining({
          body: 'Hello world',
          task_id: 'task-1',
          organization_id: 'org-1',
        }),
      })
    );
  });
});
