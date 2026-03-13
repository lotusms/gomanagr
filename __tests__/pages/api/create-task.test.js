/**
 * Unit tests for create-task API.
 * - POST only; 405 else
 * - 503 when Supabase unavailable
 * - 400 missing userId or organizationId; invalid userId; organization_id mismatch
 * - 403 not a member of organization
 * - 500 when insert fails
 * - 200 returns task when success (with or without task_number)
 */

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));

const mockFormatDocumentId = jest.fn((a, b, c, d) => `${a}-${b}-${c}-${d}`);
const mockParseDocumentId = jest.fn(() => null);
jest.mock('@/lib/documentIdsServer', () => ({
  formatDocumentId: (...args) => mockFormatDocumentId(...args),
  parseDocumentId: (...args) => mockParseDocumentId(...args),
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

describe('create-task API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatDocumentId.mockImplementation((a, b, c, d) => `${a}-${b}-${c}-${String(d).padStart(3, '0')}`);
    mockParseDocumentId.mockReturnValue(null);
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
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
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'org-1', id_prefix: 'ABC', name: 'Acme' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === 'tasks') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
          insert: (row) => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'task-1', ...row },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'task_activity') {
        return {
          insert: () => ({ then: (fn) => fn && fn(), catch: () => {} }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/create-task')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/create-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: validUuid, organizationId: 'org-1', title: 'Task' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or organizationId missing', async () => {
    const handler = (await import('@/pages/api/create-task')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or organizationId' });
  });

  it('returns 403 when not a member of organization', async () => {
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
    const handler = (await import('@/pages/api/create-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: validUuid, organizationId: 'org-1', title: 'Task' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 400 when userId is invalid UUID', async () => {
    const handler = (await import('@/pages/api/create-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'not-a-uuid', organizationId: 'org-1', title: 'Task' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid userId: could not resolve UUID' });
  });

  it('returns 500 when insert fails', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
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
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: { id_prefix: 'ABC', name: 'Acme' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'tasks') {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'insert failed' } }),
            }),
          }),
        };
      }
      if (table === 'task_activity') {
        return { insert: () => ({ then: () => {} }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: validUuid, organizationId: 'org-1', title: 'Task' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create task' });
  });

  it('returns 200 with task when success and task_number provided', async () => {
    const handler = (await import('@/pages/api/create-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: validUuid,
        organizationId: 'org-1',
        title: 'My Task',
        task_number: 'ABC-TASK-20250101-001',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.objectContaining({
          title: 'My Task',
          task_number: 'ABC-TASK-20250101-001',
        }),
      })
    );
    expect(mockFormatDocumentId).not.toHaveBeenCalled();
  });

  it('returns 200 and generates task_number when not provided', async () => {
    const handler = (await import('@/pages/api/create-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: validUuid, organizationId: 'org-1', title: 'New Task' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockFormatDocumentId).toHaveBeenCalledWith('ABC', 'TASK', expect.any(String), 1);
    const task = res.json.mock.calls[0][0].task;
    expect(task.task_number).toBeDefined();
  });
});
