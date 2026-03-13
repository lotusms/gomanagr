/**
 * Unit tests for update-org-clients API.
 * POST only; 503; 400 missing userId / invalid client; 403; 404 client not found; 500; 200.
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

let orgMembersCallCount = 0;

describe('update-org-clients API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orgMembersCallCount = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        const n = orgMembersCallCount++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { organization_id: 'org-1', role: 'admin' },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        if (n === 1) {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ user_id: 'u1' }, { user_id: 'u2' }],
                error: null,
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () =>
                  Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'admin-1', clients: [{ id: 'c1', name: 'Client 1' }] },
                  error: null,
                }),
            }),
            in: () => Promise.resolve({
              data: [{ id: 'admin-1', clients: [{ id: 'c1', name: 'Client 1' }] }],
              error: null,
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', clients: [] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId missing', async () => {
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { clients: [] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 403 when not in an organization', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
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
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', clients: [] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not in an organization' });
  });

  it('returns 200 when admin replaces full client list', async () => {
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clients: [{ id: 'c1', name: 'Client One' }],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ clients: expect.any(Array) })
    );
  });

  it('returns 403 when org members list fails or is empty', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: (cols) => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            return { eq: () => Promise.resolve({ data: [], error: null }) };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', clients: [] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not in an organization' });
  });

  it('returns 200 when admin updates single client (action update)', async () => {
    let updatePayload = null;
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }, { user_id: 'u2' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  { id: 'u1', clients: [{ id: 'client-1', name: 'Old Name', assignedTo: ['u1'] }] },
                ],
                error: null,
              }),
          }),
          update: (payload) => {
            updatePayload = payload;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        client: { id: 'client-1', name: 'New Name' },
        action: 'update',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ clients: [{ id: 'client-1', name: 'New Name', assignedTo: ['u1'] }] })
    );
    expect(updatePayload).not.toBeNull();
    expect(updatePayload.clients).toHaveLength(1);
    expect(updatePayload.clients[0].name).toBe('New Name');
  });

  it('returns 200 when admin deactivates single client (action deactivate)', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [{ id: 'u1', clients: [{ id: 'client-1', name: 'Active', status: 'active' }] }],
                error: null,
              }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        client: { id: 'client-1' },
        action: 'deactivate',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        clients: expect.arrayContaining([
          expect.objectContaining({ id: 'client-1', status: 'inactive' }),
        ]),
      })
    );
  });

  it('returns 200 when admin deletes single client (action delete)', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  { id: 'u1', clients: [{ id: 'c1', name: 'One' }, { id: 'c2', name: 'Two' }] },
                ],
                error: null,
              }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        client: { id: 'c2' },
        action: 'delete',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        clients: [{ id: 'c1', name: 'One' }],
      })
    );
  });

  it('returns 404 when client not found in any org profile', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [{ id: 'u1', clients: [{ id: 'other-id', name: 'Other' }] }],
                error: null,
              }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        client: { id: 'nonexistent' },
        action: 'update',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Client not found' });
  });

  it('returns 400 when single client has no id', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        client: { name: 'No Id' },
        action: 'update',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid client' });
  });

  it('returns 403 when member tries to edit client not assigned to them', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }, { user_id: 'u2' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'admin-1',
                    clients: [{ id: 'client-1', name: 'Client', assignedTo: ['u2'] }],
                  },
                ],
                error: null,
              }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        client: { id: 'client-1', name: 'Updated' },
        action: 'update',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not allowed to edit this client' });
  });

  it('returns 200 when member updates client assigned to them', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }, { user_id: 'u2' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'admin-1',
                    clients: [{ id: 'client-1', name: 'Old', assignedTo: ['u1'] }],
                  },
                ],
                error: null,
              }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        client: { id: 'client-1', name: 'Updated by member' },
        action: 'update',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        clients: expect.arrayContaining([
          expect.objectContaining({ id: 'client-1', name: 'Updated by member' }),
        ]),
      })
    );
  });

  it('returns 403 when organization has no admin', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', clients: [] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Organization has no admin' });
  });

  it('returns 500 when loading org admin profile fails', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'db error' } }),
            }),
          }),
          in: () => Promise.resolve({ data: [], error: null }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', clients: [] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load org clients' });
  });

  it('returns 200 when admin adds single client (action add)', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { clients: [{ id: 'existing', name: 'Existing' }] },
                  error: null,
                }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        client: { name: 'New Client', email: 'new@example.com' },
        action: 'add',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        clients: expect.any(Array),
      })
    );
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.clients).toHaveLength(2);
    const added = jsonCall.clients.find((c) => c.name === 'New Client');
    expect(added).toBeDefined();
    expect(added.id).toBeDefined();
    expect(added.addedBy).toBe('u1');
  });

  it('returns 200 when member adds single client (action add) with assignedTo', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { clients: [] },
                  error: null,
                }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        client: { name: 'Member Client' },
        action: 'add',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.clients).toHaveLength(1);
    expect(jsonCall.clients[0].assignedTo).toContain('u1');
    expect(jsonCall.clients[0].addedBy).toBe('u1');
  });

  it('returns 403 when member sends full clients replace', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { clients: [] }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clients: [{ id: 'c1', name: 'Only One' }],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Members cannot replace the full client list' });
  });

  it('returns 400 when member sends neither client+action nor clients array', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { clients: [] }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing client and action or clients array' });
  });

  it('returns 500 when saving clients fails', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { clients: [] },
                  error: null,
                }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: { message: 'update failed' } }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', clients: [] },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save clients' });
  });

  it('returns 500 when single-client path fails to load org profiles', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: null, error: { message: 'db error' } }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        client: { id: 'client-1' },
        action: 'update',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load org clients' });
  });

  it('sanitizes client assignedTo to valid strings only', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'org_members') {
        return {
          select: () => {
            const n = orgMembersCalls++;
            if (n === 0) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () =>
                      Promise.resolve({ data: { organization_id: 'org-1', role: 'admin' }, error: null }),
                  }),
                }),
              };
            }
            if (n === 1) {
              return { eq: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
                }),
              }),
            };
          },
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { clients: [] },
                  error: null,
                }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-org-clients')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clients: [
          { id: 'c1', name: 'Valid' },
          {
            id: 'c2',
            name: 'Filtered',
            assignedTo: ['u1', '', 123, null, 'u2'],
          },
        ],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const jsonCall = res.json.mock.calls[0][0];
    const withAssigned = jsonCall.clients.find((c) => c.id === 'c2');
    expect(withAssigned.assignedTo).toEqual(['u1', 'u2']);
  });
});
