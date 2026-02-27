import React from 'react';
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import TeamPage from '@/pages/dashboard/team/index';

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    pathname: '/dashboard/team',
    query: {},
    asPath: '/dashboard/team',
  }),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
jest.mock('@/components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'admin-uid', email: 'admin@example.com' },
  }),
}));

const mockGetUserAccount = jest.fn();
const mockUpdateTeamMembers = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  updateTeamMembers: (...args) => mockUpdateTeamMembers(...args),
  updateServices: jest.fn(),
  uploadTeamPhoto: jest.fn(),
}));

const mockGetUserOrganization = jest.fn();
jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      send: jest.fn(),
      unsubscribe: () => {},
    }),
  },
}));

describe('Team page – Invite to join', () => {
  let fetchCalls;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchCalls = [];
    mockGetUserAccount.mockResolvedValue({
      teamMembers: [
        { id: 'm1', name: 'Bob', email: 'bob@example.com' },
      ],
      firstName: 'Admin',
    });
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'admin' },
    });
    mockUpdateTeamMembers.mockResolvedValue(undefined);

    global.fetch = jest.fn((url, opts = {}) => {
      fetchCalls.push({ url, method: opts.method, body: opts.body });
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('get-org-members')) {
        return Promise.resolve({ json: () => Promise.resolve({ members: [] }) });
      }
      if (path.includes('get-org-invites')) {
        return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      }
      if (path.includes('create-invite')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ inviteLink: 'https://app.example/invite/xyz' }),
        });
      }
      if (path.includes('send-invite-email')) {
        return Promise.resolve({ json: () => Promise.resolve({ sent: true }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  it('sends create-invite and send-invite-email when submitting Invite to join', async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    const inviteBtn = screen.getByRole('button', { name: /invite to join/i });
    expect(inviteBtn).toBeInTheDocument();
    await act(async () => {
      inviteBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const submitBtn = within(dialog).getByRole('button', { name: /invite to join/i });
    await act(async () => {
      submitBtn.click();
    });

    await waitFor(() => {
      const createInviteCalls = fetchCalls.filter(
        (c) => c.url && String(c.url).includes('/api/create-invite')
      );
      const sendEmailCalls = fetchCalls.filter(
        (c) => c.url && String(c.url).includes('/api/send-invite-email')
      );
      expect(createInviteCalls.length).toBeGreaterThanOrEqual(1);
      expect(sendEmailCalls.length).toBeGreaterThanOrEqual(1);
    });

    const createInviteCall = fetchCalls.find(
      (c) => c.url && String(c.url).includes('/api/create-invite')
    );
    const sendEmailCall = fetchCalls.find(
      (c) => c.url && String(c.url).includes('/api/send-invite-email')
    );

    expect(createInviteCall.method).toBe('POST');
    const createBody = JSON.parse(createInviteCall.body);
    expect(createBody.organizationId).toBe('org-1');
    expect(createBody.email).toBe('bob@example.com');
    expect(createBody.invitedByUserId).toBe('admin-uid');
    expect(createBody.role).toBe('member');

    expect(sendEmailCall.method).toBe('POST');
    const emailBody = JSON.parse(sendEmailCall.body);
    expect(emailBody.to).toBe('bob@example.com');
    expect(emailBody.inviteLink).toBe('https://app.example/invite/xyz');
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('bob@example.com'));
  });
});

describe('Team page – Add member', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    mockGetUserAccount.mockResolvedValue({
      teamMembers: [],
      firstName: 'Admin',
    });
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'admin' },
    });
    mockUpdateTeamMembers.mockResolvedValue(undefined);

    global.fetch = jest.fn((url, opts = {}) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('get-org-members')) {
        return Promise.resolve({ json: () => Promise.resolve({ members: [] }) });
      }
      if (path.includes('get-org-invites')) {
        return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  it('links to add member page', async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /add member/i })).toBeInTheDocument();
    });

    const addMemberLink = screen.getByRole('link', { name: /add member/i });
    expect(addMemberLink).toHaveAttribute('href', '/dashboard/team/new');
  });
});

describe('Team page – Edit member', () => {
  const teamMember = {
    id: 'm1',
    name: 'Jane Doe',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    mockGetUserAccount.mockResolvedValue({
      teamMembers: [teamMember],
      firstName: 'Admin',
    });
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'admin' },
    });
    mockUpdateTeamMembers.mockResolvedValue(undefined);

    global.fetch = jest.fn((url) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('get-org-members')) {
        return Promise.resolve({ json: () => Promise.resolve({ members: [] }) });
      }
      if (path.includes('get-org-invites')) {
        return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  it('clicking team card navigates to edit page for that member', async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /jane doe/i });
    await act(async () => {
      card.click();
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/team/m1/edit');
  });
});

describe('Team page – Deactivate from card', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'admin' },
    });
    mockUpdateTeamMembers.mockResolvedValue(undefined);
  });

  it('when member has access, revokes first then deactivates', async () => {
    const memberWithAccess = {
      id: 'm-allison',
      name: 'Allison',
      email: 'allison@example.com',
      userId: 'allison-uid',
      role: 'Stylist',
    };
    mockGetUserAccount.mockResolvedValue({
      teamMembers: [memberWithAccess],
      firstName: 'Admin',
    });
    let fetchCalls = [];
    global.fetch = jest.fn((url, opts = {}) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      fetchCalls.push({ url: path, method: opts.method, body: opts.body });
      if (path.includes('get-org-members')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              members: [
                {
                  user_id: 'allison-uid',
                  role: 'member',
                  user: { email: 'allison@example.com' },
                },
              ],
            }),
        });
      }
      if (path.includes('get-org-invites')) {
        return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      }
      if (path.includes('revoke-org-member')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ userId: 'allison-uid' }) });
      }
      if (path.includes('update-org-team')) {
        return Promise.resolve({ ok: true });
      }
      if (path.includes('get-org-team')) {
        return Promise.resolve({ json: () => Promise.resolve({ teamMembers: [], ownerUserId: null }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('Allison')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /allison/i });
    const deactivateBtn = within(card).getByRole('button', { name: /deactivate/i });
    await act(async () => {
      deactivateBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/deactivate member/i)).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const confirmInput = within(dialog).getByLabelText(/type confirm to enable/i);
    await act(async () => {
      fireEvent.change(confirmInput, { target: { value: 'CONFIRM' } });
    });
    const confirmBtn = within(dialog).getByRole('button', { name: /^deactivate$/i });
    await act(async () => {
      confirmBtn.click();
    });

    await waitFor(() => {
      const revokeCalls = fetchCalls.filter((c) => c.url && String(c.url).includes('revoke-org-member'));
      expect(revokeCalls.length).toBe(1);
      const revokeBody = JSON.parse(revokeCalls[0].body || '{}');
      expect(revokeBody.email).toBe('allison@example.com');
      expect(revokeBody.organizationId).toBe('org-1');
      expect(revokeBody.userId).toBe('allison-uid');
    });

    await waitFor(() => {
      const updateCalls = fetchCalls.filter((c) => c.url && String(c.url).includes('update-org-team'));
      const memberCalls = mockUpdateTeamMembers.mock.calls;
      expect(updateCalls.length >= 1 || memberCalls.length >= 1).toBe(true);
    });
    const memberCalls = mockUpdateTeamMembers.mock.calls;
    const fetchUpdateCalls = fetchCalls.filter((c) => c.url && String(c.url).includes('update-org-team'));
    if (memberCalls.length >= 1) {
      const savedTeam = memberCalls[0][1];
      const allison = savedTeam.find((m) => m.id === 'm-allison');
      expect(allison).toBeDefined();
      expect(allison.status).toBe('inactive');
    } else if (fetchUpdateCalls.length >= 1) {
      const body = JSON.parse(fetchUpdateCalls[0].body || '{}');
      const allison = (body.teamMembers || []).find((m) => m.id === 'm-allison');
      expect(allison).toBeDefined();
      expect(allison.status).toBe('inactive');
    }
  });

  it('when member has no access, deactivates without calling revoke', async () => {
    const memberNoAccess = {
      id: 'm-bob',
      name: 'Bob',
      email: 'bob@example.com',
      role: 'Stylist',
    };
    mockGetUserAccount.mockResolvedValue({
      teamMembers: [memberNoAccess],
      firstName: 'Admin',
    });
    let fetchCalls = [];
    global.fetch = jest.fn((url, opts = {}) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      fetchCalls.push({ url: path, method: opts.method, body: opts.body });
      if (path.includes('get-org-members')) {
        return Promise.resolve({ json: () => Promise.resolve({ members: [] }) });
      }
      if (path.includes('get-org-invites')) {
        return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      }
      if (path.includes('update-org-team')) {
        return Promise.resolve({ ok: true });
      }
      if (path.includes('get-org-team')) {
        return Promise.resolve({ json: () => Promise.resolve({ teamMembers: [], ownerUserId: null }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /bob/i });
    const deactivateBtn = within(card).getByRole('button', { name: /deactivate/i });
    await act(async () => {
      deactivateBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const confirmInput = within(dialog).getByLabelText(/type confirm to enable/i);
    await act(async () => {
      fireEvent.change(confirmInput, { target: { value: 'CONFIRM' } });
    });
    const confirmBtn = within(dialog).getByRole('button', { name: /^deactivate$/i });
    await act(async () => {
      confirmBtn.click();
    });

    await waitFor(() => {
      const revokeCalls = fetchCalls.filter((c) => c.url && String(c.url).includes('revoke-org-member'));
      expect(revokeCalls.length).toBe(0);
    });

    await waitFor(() => {
      const updateCalls = fetchCalls.filter((c) => c.url && String(c.url).includes('update-org-team'));
      const memberCalls = mockUpdateTeamMembers.mock.calls;
      expect(updateCalls.length >= 1 || memberCalls.length >= 1).toBe(true);
    });
    const memberCalls = mockUpdateTeamMembers.mock.calls;
    const fetchUpdateCalls = fetchCalls.filter((c) => c.url && String(c.url).includes('update-org-team'));
    if (memberCalls.length >= 1) {
      const savedTeam = memberCalls[0][1];
      const bob = savedTeam.find((m) => m.id === 'm-bob');
      expect(bob).toBeDefined();
      expect(bob.status).toBe('inactive');
    } else if (fetchUpdateCalls.length >= 1) {
      const body = JSON.parse(fetchUpdateCalls[0].body || '{}');
      const bob = (body.teamMembers || []).find((m) => m.id === 'm-bob');
      expect(bob).toBeDefined();
      expect(bob.status).toBe('inactive');
    }
  });
});

describe('Team page – Card labels from org role', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'admin' },
    });
    mockUpdateTeamMembers.mockResolvedValue(undefined);
  });

  it('shows Super Admin, Admin, and job title from org role (not stored member.role)', async () => {
    const teamMembers = [
      { id: 'owner-luis', name: 'Luis Silva', email: 'luis@example.com', userId: 'luis-uid', role: 'Owner' },
      { id: 'm-angela', name: 'Angela Martin', email: 'angela@example.com', userId: 'angela-uid', role: 'Owner' },
      { id: 'm-mitzi', name: 'Mitzi Andersons', email: 'mitzi@example.com', userId: 'mitzi-uid', role: 'Support Staff' },
    ];
    mockGetUserAccount.mockResolvedValue({
      teamMembers,
      firstName: 'Admin',
    });
    const orgMembers = [
      { user_id: 'luis-uid', role: 'superadmin', user: { id: 'luis-uid', email: 'luis@example.com' } },
      { user_id: 'angela-uid', role: 'admin', user: { id: 'angela-uid', email: 'angela@example.com' } },
      { user_id: 'mitzi-uid', role: 'member', user: { id: 'mitzi-uid', email: 'mitzi@example.com' } },
    ];
    global.fetch = jest.fn((url, opts = {}) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('get-org-members')) {
        return Promise.resolve({ json: () => Promise.resolve({ members: orgMembers }) });
      }
      if (path.includes('get-org-invites')) {
        return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('Luis Silva')).toBeInTheDocument();
      expect(screen.getByText('Angela Martin')).toBeInTheDocument();
      expect(screen.getByText('Mitzi Andersons')).toBeInTheDocument();
    });

    const luisCard = screen.getByRole('button', { name: /luis silva/i });
    const angelaCard = screen.getByRole('button', { name: /angela martin/i });
    const mitziCard = screen.getByRole('button', { name: /mitzi andersons/i });

    expect(within(luisCard).getByText('Super Admin')).toBeInTheDocument();
    expect(within(angelaCard).getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
    expect(within(mitziCard).getByText('Support Staff')).toBeInTheDocument();
    expect(within(luisCard).queryByText(/^Owner$/)).not.toBeInTheDocument();
    expect(within(angelaCard).queryByText(/^Owner$/)).not.toBeInTheDocument();
  });

  it('when team member has no org role, card shows member.role', async () => {
    const teamMembers = [
      { id: 'm-no-org', name: 'No Org User', email: 'noorg@example.com', role: 'Contractor' },
    ];
    mockGetUserAccount.mockResolvedValue({
      teamMembers,
      firstName: 'Admin',
    });
    global.fetch = jest.fn((url) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('get-org-members')) {
        return Promise.resolve({ json: () => Promise.resolve({ members: [] }) });
      }
      if (path.includes('get-org-invites')) {
        return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('No Org User')).toBeInTheDocument();
    });

    expect(screen.getByText('Contractor')).toBeInTheDocument();
  });

  it('shows Developer when org role is developer', async () => {
    const teamMembers = [
      { id: 'm-dev', name: 'Dev User', email: 'dev@example.com', userId: 'dev-uid', role: 'Engineer' },
    ];
    mockGetUserAccount.mockResolvedValue({
      teamMembers,
      firstName: 'Admin',
    });
    global.fetch = jest.fn((url) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('get-org-members')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              members: [
                { user_id: 'dev-uid', role: 'developer', user: { id: 'dev-uid', email: 'dev@example.com' } },
              ],
            }),
        });
      }
      if (path.includes('get-org-invites')) {
        return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('Dev User')).toBeInTheDocument();
    });

    expect(screen.getByText('Developer')).toBeInTheDocument();
  });
});

describe('Team page – Deactivated members', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'admin' },
    });
    mockUpdateTeamMembers.mockResolvedValue(undefined);
    global.fetch = jest.fn((url) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('get-org-members')) return Promise.resolve({ json: () => Promise.resolve({ members: [] }) });
      if (path.includes('get-org-invites')) return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  it('shows Deactivated Members button only for org admin', async () => {
    mockGetUserAccount.mockResolvedValue({ teamMembers: [], firstName: 'Admin' });
    const { unmount } = render(<TeamPage />);
    await waitFor(() => {
      expect(screen.getByTestId('deactivated-members-button')).toBeInTheDocument();
    });
    unmount();

    mockGetUserOrganization.mockResolvedValue({ id: 'org-1', membership: { role: 'member' } });
    mockGetUserAccount.mockResolvedValue({ teamMembers: [], firstName: 'User' });
    render(<TeamPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('deactivated-members-button')).not.toBeInTheDocument();
  });

  it('opens panel with empty state when no deactivated members', async () => {
    mockGetUserAccount.mockResolvedValue({ teamMembers: [], firstName: 'Admin' });
    render(<TeamPage />);
    await waitFor(() => {
      expect(screen.getByTestId('deactivated-members-button')).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByTestId('deactivated-members-button').click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('deactivated-members-panel')).toBeInTheDocument();
      expect(screen.getByTestId('deactivated-members-empty')).toHaveTextContent('No deactivated members.');
    });
  });

  it('shows table of deactivated members and reactivate adds them back to team', async () => {
    const inactiveMember = { id: 'inactive-1', name: 'Inactive Bob', email: 'bob@example.com', role: 'Stylist', status: 'inactive' };
    mockGetUserAccount.mockResolvedValue({
      teamMembers: [inactiveMember],
      firstName: 'Admin',
    });
    render(<TeamPage />);
    await waitFor(() => {
      expect(screen.getByTestId('deactivated-members-button')).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByTestId('deactivated-members-button').click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('deactivated-members-table')).toBeInTheDocument();
      expect(screen.getByText('Inactive Bob')).toBeInTheDocument();
    });
    const reactivateButtons = screen.getAllByRole('button', { name: /reactivate/i });
    await act(async () => {
      reactivateButtons[0].click();
    });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/reactivate member/i)).toBeInTheDocument();
      expect(screen.getByText(/will be reactivated/i)).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /^reactivate$/i });
    await act(async () => {
      confirmBtn.click();
    });
    await waitFor(() => {
      expect(mockUpdateTeamMembers).toHaveBeenCalled();
      const saved = mockUpdateTeamMembers.mock.calls[0][1];
      const reactivated = saved.find((m) => m.id === 'inactive-1');
      expect(reactivated).toBeDefined();
      expect(reactivated.status).toBe('active');
    });
  });

  it('Delete forever opens confirmation and permanently removes member on confirm', async () => {
    const inactiveMember = { id: 'del-1', name: 'To Delete', email: 'del@example.com', role: 'Member', status: 'inactive' };
    mockGetUserAccount.mockResolvedValue({
      teamMembers: [inactiveMember],
      firstName: 'Admin',
    });
    render(<TeamPage />);
    await waitFor(() => {
      expect(screen.getByTestId('deactivated-members-button')).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByTestId('deactivated-members-button').click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('deactivated-members-table')).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByRole('button', { name: /delete forever/i });
    await act(async () => {
      deleteButtons[0].click();
    });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/permanently delete member/i)).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText(/type delete to confirm/i);
    await act(async () => {
      input.focus();
      fireEvent.change(input, { target: { value: 'delete' } });
    });
    const confirmBtn = within(dialog).getByRole('button', { name: /delete forever/i });
    await act(async () => {
      confirmBtn.click();
    });
    await waitFor(() => {
      expect(mockUpdateTeamMembers).toHaveBeenCalled();
      const saved = mockUpdateTeamMembers.mock.calls[0][1];
      expect(saved.some((m) => m.id === 'del-1')).toBe(false);
    });
  });
});
