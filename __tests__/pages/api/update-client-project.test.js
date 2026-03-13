/**
 * Unit tests for update-client-project API.
 * POST/PUT only; 503; 400 missing userId/projectId; 404 project not found;
 * 403 ownership/org; 500 update error; 200 ok.
 */

const mockEnsureAttachments = jest.fn(() => Promise.resolve());
jest.mock('@/lib/syncFilesToAttachments', () => ({
  ensureAttachmentsFromFiles: mockEnsureAttachments,
}));

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

const defaultProject = {
  id: 'proj-1',
  user_id: 'u1',
  organization_id: null,
  client_id: 'c1',
  project_name: 'Project',
  status: 'active',
};

describe('update-client-project API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureAttachments.mockResolvedValue(undefined);
    mockFrom.mockImplementation((t) => {
      if (t === 'client_projects') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: defaultProject, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
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
      return {};
    });
  });

  it('returns 405 for non-POST/non-PUT', async () => {
    const handler = (await import('@/pages/api/update-client-project')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('accepts PUT', async () => {
    const handler = (await import('@/pages/api/update-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'PUT',
      body: { userId: 'u1', projectId: 'proj-1', project_name: 'Updated' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/update-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', projectId: 'proj-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or projectId missing', async () => {
    const handler = (await import('@/pages/api/update-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { projectId: 'proj-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or projectId' });
  });

  it('returns 404 when project not found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_projects') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', projectId: 'bad-id' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
  });

  it('returns 403 when project does not belong to user (no org)', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_projects') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...defaultProject, user_id: 'other' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', projectId: 'proj-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Project does not belong to you' });
  });

  it('returns 403 when organizationId does not match project org', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_projects') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...defaultProject, organization_id: 'org-other' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', projectId: 'proj-1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Project does not belong to this organization' });
  });

  it('returns 500 when update fails', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_projects') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: defaultProject, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: { message: 'db error' } }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', projectId: 'proj-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update project' });
  });

  it('returns 200 and updates when ownership valid', async () => {
    const handler = (await import('@/pages/api/update-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', projectId: 'proj-1', project_name: 'New Name' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(mockFrom).toHaveBeenCalledWith('client_projects');
  });

  it('calls ensureAttachmentsFromFiles when file_urls provided', async () => {
    const handler = (await import('@/pages/api/update-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        projectId: 'proj-1',
        file_urls: ['https://example.com/file.pdf'],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockEnsureAttachments).toHaveBeenCalled();
  });
});
