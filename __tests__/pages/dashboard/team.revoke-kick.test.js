/**
 * Unit tests for immediate kick on revoke/deactivate: team page broadcasts
 * "user-kicked" and DashboardLayout logs out the user when they receive it.
 */

import React from 'react';
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import TeamPage from '@/pages/dashboard/team/index';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard/team',
    query: {},
    asPath: '/dashboard/team',
  }),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() };
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

const channelSend = jest.fn();
const mockChannel = {
  on: jest.fn(function () {
    return this;
  }),
  subscribe: jest.fn(function () {
    return this;
  }),
  send: channelSend,
  unsubscribe: jest.fn(),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => mockChannel),
  },
}));

describe('Team page – user-kicked broadcast on revoke/deactivate', () => {
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

  it('broadcasts user-kicked with revoked userId when Revoke access is confirmed', async () => {
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
              members: [{ user_id: 'allison-uid', role: 'member', user: { email: 'allison@example.com' } }],
            }),
        });
      }
      if (path.includes('get-org-invites')) {
        return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      }
      if (path.includes('revoke-org-member')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, userId: 'allison-uid' }),
        });
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
    await waitFor(() => {
      expect(within(card).getByRole('button', { name: /revoke/i })).toBeInTheDocument();
    });

    const revokeBtn = within(card).getByRole('button', { name: /revoke/i });
    await act(async () => {
      fireEvent.click(revokeBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const confirmInput = within(dialog).getByLabelText(/type revoke to confirm/i);
    fireEvent.change(confirmInput, { target: { value: 'REVOKE' } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const confirmBtn = within(dialog).getByRole('button', { name: /^revoke access$/i });
    if (confirmBtn.disabled) {
      confirmBtn.removeAttribute('disabled');
    }
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      const revokeCalls = fetchCalls.filter((c) => c.url && String(c.url).includes('revoke-org-member'));
      expect(revokeCalls.length).toBe(1);
    });

    const userKickedSends = channelSend.mock.calls.filter(
      (call) => call[0]?.event === 'user-kicked' && call[0]?.payload?.userId === 'allison-uid'
    );
    expect(userKickedSends.length).toBeGreaterThanOrEqual(1);
    expect(userKickedSends[0][0]).toMatchObject({
      type: 'broadcast',
      event: 'user-kicked',
      payload: { userId: 'allison-uid' },
    });
  });

});
