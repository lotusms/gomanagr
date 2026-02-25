/**
 * Unit tests for createUserAccount broadcasting "team-updated" when a member
 * accepts an invite (so the team page updates the card without refresh).
 */

const channelSend = jest.fn();
const mockChannel = {
  subscribe: jest.fn((cb) => {
    if (typeof cb === 'function') cb('SUBSCRIBED');
    return mockChannel;
  }),
  send: channelSend,
  unsubscribe: jest.fn(),
};

const minimalExistingProfile = {
  id: 'existing-uid',
  email: 'existing@example.com',
  first_name: 'Existing',
  last_name: 'User',
  created_at: '2020-01-01T00:00:00.000Z',
  updated_at: '2020-01-01T00:00:00.000Z',
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: { access_token: 'fake-token' } },
        }),
    },
    channel: jest.fn(() => mockChannel),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: minimalExistingProfile,
              error: null,
            }),
        }),
      }),
    }),
  },
}));

global.fetch = jest.fn();

const { createUserAccount } = require('@/services/userService');

describe('createUserAccount – broadcast team-updated after invite acceptance', () => {
  let logSpy;
  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          userId: 'new-user-uid',
          email: 'newuser@example.com',
          organization: {
            id: 'org-123',
            name: 'Test Org',
            membership: { role: 'member' },
          },
        }),
    });
  });

  it('broadcasts team-updated on org channel when inviteToken is provided and response includes organization.id', async () => {
    await createUserAccount(
      'new-user-uid',
      {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      null,
      'invite-token-abc',
      'access-token'
    );

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/create-user-account-v2',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('invite-token-abc'),
      })
    );

    expect(mockChannel.subscribe).toHaveBeenCalled();
    expect(channelSend).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'team-updated',
      payload: {},
    });
  });

  it('uses org id from response for channel name', async () => {
    const { supabase } = require('@/lib/supabase');
    await createUserAccount(
      'uid',
      { email: 'a@b.com', createdAt: '', updatedAt: '' },
      null,
      'token',
      'access'
    );

    expect(supabase.channel).toHaveBeenCalledWith('org:org-123');
  });

  it('does not broadcast when inviteToken is not provided', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          userId: 'uid',
          organization: { id: 'org-456' },
        }),
    });

    await createUserAccount(
      'uid',
      { email: 'a@b.com', createdAt: '', updatedAt: '' },
      null,
      null,
      'access'
    );

    expect(mockChannel.subscribe).not.toHaveBeenCalled();
    expect(channelSend).not.toHaveBeenCalled();
  });

  it('does not broadcast when API response has no organization.id', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          userId: 'uid',
          email: 'a@b.com',
          organization: { name: 'Org' },
        }),
    });

    await createUserAccount(
      'uid',
      { email: 'a@b.com', createdAt: '', updatedAt: '' },
      null,
      'token',
      'access'
    );

    expect(mockChannel.subscribe).not.toHaveBeenCalled();
    expect(channelSend).not.toHaveBeenCalled();
  });

  it('does not throw when broadcast fails (e.g. channel never SUBSCRIBED)', async () => {
    const result = await createUserAccount(
      'uid',
      { email: 'a@b.com', createdAt: '', updatedAt: '' },
      null,
      'token',
      'access'
    );

    expect(result).toBeDefined();
    expect(result.organization?.id).toBe('org-123');
  });

  afterEach(() => {
    logSpy?.mockRestore();
  });
});
