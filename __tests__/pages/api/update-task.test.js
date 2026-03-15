/**
 * Unit tests for update-task API.
 * POST only; 503; 400 missing params; 403 not member; 404 task not found; 500; 200.
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

const defaultTask = {
  id: 'task-1',
  organization_id: 'org-1',
  title: 'Task',
  status: 'to_do',
  assignee_id: null,
  due_at: null,
  priority: null,
  client_id: null,
  project_id: null,
  duration_days: null,
};

describe('update-task API', () => {
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
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: defaultTask, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: () =>
                    Promise.resolve({ data: { ...defaultTask, title: 'Updated' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'task_activity') {
        return {
          insert: () => Promise.resolve({ error: null }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1', title: 'New' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId, organizationId, or taskId missing', async () => {
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId, organizationId, or taskId' });
  });

  it('returns 403 when not a member of the organization', async () => {
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
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1', title: 'New' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 404 when task not found', async () => {
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
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'bad-id', title: 'New' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Task not found' });
  });

  it('returns 200 with task when update succeeds', async () => {
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1', title: 'Updated' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ task: expect.objectContaining({ title: 'Updated' }) })
    );
  });

  it('returns 200 with existing task when body has no updatable fields (only updated_at)', async () => {
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ task: defaultTask }));
  });

  it('returns 404 when no updatable fields and task not found', async () => {
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
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Task not found' });
  });

  it('returns 500 when tasks update returns error', async () => {
    let tasksCall = 0;
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
        tasksCall++;
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: defaultTask, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: () =>
                    Promise.resolve({ data: null, error: { message: 'RLS denied' } }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1', title: 'New' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update task' });
  });

  it('returns 404 when tasks update returns no data', async () => {
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
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: defaultTask, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1', title: 'New' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Task not found' });
  });

  it('inserts task_activity when status/assignee/due_at/title/priority/client/project/duration_days change', async () => {
    const existingWithValues = {
      ...defaultTask,
      status: 'to_do',
      assignee_id: null,
      due_at: null,
      title: 'Old Title',
      priority: 'low',
      client_id: null,
      project_id: null,
      duration_days: null,
    };
    const updatedTask = {
      ...existingWithValues,
      status: 'in_progress',
      assignee_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      due_at: '2024-06-01',
      title: 'New Title',
      priority: 'high',
      client_id: 'c1',
      project_id: 'p1',
      duration_days: 2,
    };
    let tasksCall = 0;
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
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
        tasksCall++;
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: tasksCall === 1 ? existingWithValues : null,
                    error: null,
                  }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: () =>
                    Promise.resolve({ data: updatedTask, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'task_activity') {
        return { insert: (rows) => mockInsert(rows) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'owner-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        organizationId: 'org-1',
        taskId: 'task-1',
        status: 'in_progress',
        assignee_id: 'owner-b2c3d4e5-f6a7-8901-bcde-f12345678901',
        due_at: '2024-06-01',
        title: 'New Title',
        priority: 'high',
        client_id: 'c1',
        project_id: 'p1',
        duration_days: 2,
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ task: updatedTask }));
    expect(mockInsert).toHaveBeenCalled();
    const inserted = mockInsert.mock.calls[0][0];
    expect(Array.isArray(inserted)).toBe(true);
    const kinds = inserted.map((r) => r.kind);
    expect(kinds).toContain('status');
    expect(kinds).toContain('assignee');
    expect(kinds).toContain('due_at');
    expect(kinds).toContain('title');
    expect(kinds).toContain('priority');
    expect(kinds).toContain('client');
    expect(kinds).toContain('project');
    expect(kinds).toContain('duration_days');
  });

  it('normalizes empty title to Untitled task and accepts status/priority', async () => {
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
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: defaultTask, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        ...defaultTask,
                        title: 'Untitled task',
                        status: 'done',
                        priority: 'urgent',
                      },
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        organizationId: 'org-1',
        taskId: 'task-1',
        title: '   ',
        status: 'done',
        priority: 'urgent',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.objectContaining({
          title: 'Untitled task',
          status: 'done',
          priority: 'urgent',
        }),
      })
    );
  });

  it('applies buildUpdate fields: description, assigneeId, dueAt, startDate, position, projectId, clientId, linked_*, task_number, subtasks', async () => {
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
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: defaultTask, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        ...defaultTask,
                        description: 'New desc',
                        assignee_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        due_at: '2024-12-01',
                        start_date: '2024-11-01',
                        position: 5,
                        project_id: 'proj-1',
                        client_id: 'cli-1',
                        linked_client_id: 'lc1',
                        linked_project_id: 'lp1',
                        task_number: 'T-42',
                        subtasks: [{ id: 's1', title: 'Sub' }],
                      },
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        organizationId: 'org-1',
        taskId: 'task-1',
        description: 'New desc',
        assigneeId: 'auth-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        dueAt: '2024-12-01',
        durationDays: 3,
        startDate: '2024-11-01',
        position: 5,
        projectId: 'proj-1',
        clientId: 'cli-1',
        linked_client_id: 'lc1',
        linked_project_id: 'lp1',
        linked_invoice_id: 'li1',
        task_number: 'T-42',
        subtasks: [{ id: 's1', title: 'Sub' }],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.objectContaining({
          description: 'New desc',
          assignee_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          due_at: '2024-12-01',
          start_date: '2024-11-01',
          position: 5,
          project_id: 'proj-1',
          client_id: 'cli-1',
          task_number: 'T-42',
        }),
      })
    );
  });

  it('returns 500 when handler throws', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.reject(new Error('DB error')),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-task')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', taskId: 'task-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update task' });
  });
});
