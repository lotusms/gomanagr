/**
 * Unit tests for get-org-team-list API:
 * - Returns 405 for non-POST
 * - Returns 400 when organizationId or callerUserId missing
 * - Returns 403 when caller is not a member of the organization
 * - Returns 200 with teamMembers array when caller is org member (any role)
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

describe('get-org-team-list API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'role') {
              return {
                eq: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({ data: { role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (cols === 'user_id') {
              const listPromise = Promise.resolve({
                data: [
                  { user_id: 'u1' },
                  { user_id: 'u2' },
                ],
                error: null,
              });
              const chain = {
                eq: (col, val) => {
                  if (col !== 'role') return Promise.resolve({ data: null, error: null });
                  if (val === 'superadmin') {
                    return {
                      limit: () => ({
                        maybeSingle: () =>
                          Promise.resolve({
                            data: { user_id: 'owner-1' },
                            error: null,
                          }),
                      }),
                    };
                  }
                  // developer / admin: API calls .limit(1); return object with limit returning Promise
                  return {
                    limit: () =>
                      Promise.resolve({
                        data: val === 'developer' ? [{ user_id: 'owner-1' }] : [],
                        error: null,
                      }),
                  };
                },
              };
              return {
                eq: (col) =>
                  col === 'organization_id'
                    ? Object.assign(listPromise, chain)
                    : listPromise,
              };
            }
            return {};
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: (cols) => {
            if (typeof cols === 'string' && cols.includes('team_members')) {
              return {
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { team_members: [] },
                      error: null,
                    }),
                }),
              };
            }
            return {
              in: () =>
                Promise.resolve({
                  data: [
                    { id: 'u1', first_name: 'Alice', last_name: 'A', email: 'alice@test.com' },
                    { id: 'u2', first_name: 'Bob', last_name: 'B', email: 'bob@test.com' },
                  ],
                  error: null,
                }),
            };
          },
        };
      }
      return {};
    });
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when organizationId or callerUserId is missing', async () => {
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing organizationId or callerUserId',
    });
  });

  it('returns 403 when caller is not a member of the organization', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'role') {
              return {
                eq: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({ data: null, error: { message: 'not found' } }),
                  }),
                }),
              };
            }
            return {};
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-99' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not a member of this organization',
    });
  });

  it('returns 200 with teamMembers array when caller is org member', async () => {
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.teamMembers).toHaveLength(2);
    expect(payload.teamMembers[0]).toMatchObject({
      id: 'u1',
      user_id: 'u1',
      name: 'Alice A',
      email: 'alice@test.com',
    });
    expect(payload.teamMembers[1]).toMatchObject({
      id: 'u2',
      user_id: 'u2',
      name: 'Bob B',
      email: 'bob@test.com',
    });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns Unknown for userId with no profile and includes owner team_members with photos', async () => {
    let userIdListCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'role') {
              return {
                eq: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({ data: { role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (cols === 'user_id') {
              return {
                eq: (col, val) => {
                  if (col === 'organization_id') {
                    userIdListCalls++;
                    if (userIdListCalls === 1) {
                      return Promise.resolve({
                        data: [{ user_id: 'u1' }, { user_id: 'u-no-profile' }],
                        error: null,
                      });
                    }
                    return {
                      eq: (_roleCol, roleVal) => ({
                        limit: () =>
                          roleVal === 'superadmin'
                            ? {
                                maybeSingle: () =>
                                  Promise.resolve({
                                    data: { user_id: 'owner-1' },
                                    error: null,
                                  }),
                              }
                            : Promise.resolve({
                                data: roleVal === 'developer' ? [{ user_id: 'owner-1' }] : [],
                                error: null,
                              }),
                      }),
                    };
                  }
                  return Promise.resolve({ data: [], error: null });
                },
              };
            }
            return {};
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: (cols) => {
            if (typeof cols === 'string' && cols.includes('team_members')) {
              return {
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        team_members: [
                          {
                            userId: 'invited-1',
                            firstName: 'Invited',
                            lastName: 'User',
                            email: 'invited@test.com',
                            pictureUrl: 'https://cdn.example.com/photo.jpg',
                          },
                        ],
                      },
                      error: null,
                    }),
                }),
              };
            }
            return {
              in: () =>
                Promise.resolve({
                  data: [
                    { id: 'u1', first_name: 'Alice', last_name: 'A', email: 'alice@test.com' },
                  ],
                  error: null,
                }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.teamMembers).toBeDefined();
    const unknownMember = payload.teamMembers.find((m) => m.id === 'u-no-profile');
    expect(unknownMember).toMatchObject({
      id: 'u-no-profile',
      user_id: 'u-no-profile',
      name: 'Unknown',
      displayName: 'Unknown',
      email: '',
    });
    const appended = payload.teamMembers.find((m) => m.id === 'invited-1');
    expect(appended).toMatchObject({
      id: 'invited-1',
      user_id: 'invited-1',
      name: 'Invited User',
      email: 'invited@test.com',
      photoUrl: 'https://cdn.example.com/photo.jpg',
    });
  });

  it('returns 200 with empty teamMembers when org member list fails or empty', async () => {
    let userIdListCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'role') {
              return {
                eq: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({ data: { role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (cols === 'user_id') {
              return {
                eq: (col) => {
                  if (col === 'organization_id') {
                    userIdListCalls++;
                    if (userIdListCalls === 1) {
                      return Promise.resolve({ data: null, error: { message: 'error' } });
                    }
                    return {
                      eq: (_col, roleVal) => ({
                        limit: () =>
                          roleVal === 'superadmin'
                            ? { maybeSingle: () => Promise.resolve({ data: null, error: null }) }
                            : Promise.resolve({ data: [], error: null }),
                      }),
                    };
                  }
                  return Promise.resolve({ data: [], error: null });
                },
              };
            }
            return {};
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.teamMembers).toEqual([]);
  });

  it('returns all Unknown when user_profiles returns empty', async () => {
    let userIdListCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'role') {
              return {
                eq: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({ data: { role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (cols === 'user_id') {
              return {
                eq: (col) => {
                  if (col === 'organization_id') {
                    userIdListCalls++;
                    if (userIdListCalls === 1) {
                      return Promise.resolve({
                        data: [{ user_id: 'u1' }, { user_id: 'u2' }],
                        error: null,
                      });
                    }
                    // superadmin (call 2): .eq('role').limit(1).maybeSingle()
                    if (userIdListCalls === 2) {
                      return {
                        eq: () => ({
                          limit: () => ({
                            maybeSingle: () =>
                              Promise.resolve({ data: null, error: null }),
                          }),
                        }),
                      };
                    }
                    // developer / admin (calls 3, 4): .eq('role').limit(1)
                    return {
                      eq: () => ({
                        limit: () => Promise.resolve({ data: [], error: null }),
                      }),
                    };
                  }
                  return Promise.resolve({ data: [], error: null });
                },
              };
            }
            return {};
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.teamMembers).toHaveLength(2);
    expect(payload.teamMembers.every((m) => m.name === 'Unknown' && m.displayName === 'Unknown')).toBe(true);
  });

  it('returns all Unknown when user_profiles returns error', async () => {
    let userIdListCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'role') {
              return {
                eq: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({ data: { role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (cols === 'user_id') {
              return {
                eq: (col) => {
                  if (col === 'organization_id') {
                    userIdListCalls++;
                    if (userIdListCalls === 1) {
                      return Promise.resolve({
                        data: [{ user_id: 'u1' }],
                        error: null,
                      });
                    }
                    if (userIdListCalls === 2) {
                      return {
                        eq: () => ({
                          limit: () => ({
                            maybeSingle: () =>
                              Promise.resolve({ data: null, error: null }),
                          }),
                        }),
                      };
                    }
                    return {
                      eq: () => ({
                        limit: () => Promise.resolve({ data: [], error: null }),
                      }),
                    };
                  }
                  return Promise.resolve({ data: [], error: null });
                },
              };
            }
            return {};
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({ data: null, error: { message: 'profile error' } }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.teamMembers).toHaveLength(1);
    expect(payload.teamMembers[0].name).toBe('Unknown');
    expect(payload.teamMembers[0].displayName).toBe('Unknown');
  });

  it('uses developer as owner when no superadmin', async () => {
    let userIdListCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'role') {
              return {
                eq: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({ data: { role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (cols === 'user_id') {
              return {
                eq: (col) => {
                  if (col === 'organization_id') {
                    userIdListCalls++;
                    if (userIdListCalls === 1) {
                      return Promise.resolve({
                        data: [{ user_id: 'u1' }],
                        error: null,
                      });
                    }
                    if (userIdListCalls === 2) {
                      return {
                        eq: (roleCol, roleVal) => ({
                          limit: () =>
                            roleVal === 'superadmin'
                              ? {
                                  maybeSingle: () =>
                                    Promise.resolve({ data: null, error: null }),
                                }
                              : roleVal === 'developer'
                                ? Promise.resolve({
                                    data: [{ user_id: 'dev-owner-id' }],
                                    error: null,
                                  })
                                : Promise.resolve({ data: [], error: null }),
                        }),
                      };
                    }
                    return {
                      eq: () => ({
                        limit: () => Promise.resolve({ data: [], error: null }),
                      }),
                    };
                  }
                  return Promise.resolve({ data: [], error: null });
                },
              };
            }
            return {};
          },
        };
      }
      if (table === 'user_profiles') {
        let profileCalls = 0;
        return {
          select: (cols) => {
            if (cols === 'id, first_name, last_name, email') {
              return {
                in: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: 'u1',
                        first_name: 'Jane',
                        last_name: 'Doe',
                        email: 'jane@example.com',
                      },
                    ],
                    error: null,
                  }),
              };
            }
            if (cols === 'team_members') {
              profileCalls++;
              return {
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { team_members: [] },
                      error: null,
                    }),
                }),
              };
            }
            return { in: () => Promise.resolve({ data: [], error: null }) };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.teamMembers).toHaveLength(1);
    expect(payload.teamMembers[0].id).toBe('u1');
    expect(payload.teamMembers[0].name).toBe('Jane Doe');
  });

  it('uses admin as owner when no superadmin or developer', async () => {
    let userIdListCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'role') {
              return {
                eq: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({ data: { role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (cols === 'user_id') {
              return {
                eq: (col) => {
                  if (col === 'organization_id') {
                    userIdListCalls++;
                    if (userIdListCalls === 1) {
                      return Promise.resolve({
                        data: [{ user_id: 'u1' }],
                        error: null,
                      });
                    }
                    if (userIdListCalls === 2) {
                      return {
                        eq: (roleCol, roleVal) => ({
                          limit: () =>
                            roleVal === 'superadmin'
                              ? {
                                  maybeSingle: () =>
                                    Promise.resolve({ data: null, error: null }),
                                }
                              : roleVal === 'developer'
                                ? Promise.resolve({ data: [], error: null })
                                : Promise.resolve({
                                    data: [{ user_id: 'admin-owner-id' }],
                                    error: null,
                                  }),
                        }),
                      };
                    }
                    return {
                      eq: () => ({
                        limit: () => Promise.resolve({ data: [], error: null }),
                      }),
                    };
                  }
                  return Promise.resolve({ data: [], error: null });
                },
              };
            }
            return {};
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: (cols) => {
            if (cols === 'id, first_name, last_name, email') {
              return {
                in: () =>
                  Promise.resolve({
                    data: [{ id: 'u1', first_name: 'A', last_name: 'B', email: 'a@b.com' }],
                    error: null,
                  }),
              };
            }
            if (cols === 'team_members') {
              return {
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { team_members: null },
                      error: null,
                    }),
                }),
              };
            }
            return { in: () => Promise.resolve({ data: [], error: null }) };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.teamMembers).toHaveLength(1);
  });

  it('returns 500 when handler throws', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.reject(new Error('DB connection lost')),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringMatching(/DB connection lost|Failed to load team list/),
    });
  });
});
