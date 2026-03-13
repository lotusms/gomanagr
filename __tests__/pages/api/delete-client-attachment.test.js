/**
 * Unit tests for delete-client-attachment API.
 * - POST/DELETE allowed; 405 else
 * - 503 when Supabase unavailable
 * - 400 missing userId or attachmentId
 * - 404 attachment not found
 * - 403 attachment not in org / not owned by user
 * - 500 when delete fails
 * - 200 ok when success
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

describe('delete-client-attachment API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'att-1', user_id: 'u1', organization_id: null },
                    error: null,
                  }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
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
      return {};
    });
  });

  it('returns 405 for unsupported method', async () => {
    const handler = (await import('@/pages/api/delete-client-attachment')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/delete-client-attachment')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', attachmentId: 'att-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or attachmentId missing', async () => {
    const handler = (await import('@/pages/api/delete-client-attachment')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or attachmentId' });
  });

  it('returns 404 when attachment not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
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
    const handler = (await import('@/pages/api/delete-client-attachment')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', attachmentId: 'att-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Attachment not found' });
  });

  it('returns 403 when personal attachment and user_id does not match', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'att-1', user_id: 'other-user', organization_id: null },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/delete-client-attachment')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', attachmentId: 'att-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Attachment does not belong to you' });
  });

  it('returns 403 when organizationId provided but attachment belongs to different org', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'att-1', user_id: 'u1', organization_id: 'org-2' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
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
      return {};
    });
    const handler = (await import('@/pages/api/delete-client-attachment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', attachmentId: 'att-1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Attachment does not belong to this organization',
    });
  });

  it('returns 500 when delete fails', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'att-1', user_id: 'u1', organization_id: null },
                    error: null,
                  }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: { message: 'delete failed' } }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/delete-client-attachment')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', attachmentId: 'att-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete attachment' });
  });

  it('returns 200 when delete succeeds (personal)', async () => {
    const handler = (await import('@/pages/api/delete-client-attachment')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', attachmentId: 'att-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('returns 200 when delete succeeds with organizationId', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'att-1', user_id: 'u1', organization_id: 'org-1' },
                    error: null,
                  }),
              }),
            }),
          }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
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
      return {};
    });
    const handler = (await import('@/pages/api/delete-client-attachment')).default;
    const res = mockRes();
    await handler({
      method: 'DELETE',
      body: { userId: 'u1', attachmentId: 'att-1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
