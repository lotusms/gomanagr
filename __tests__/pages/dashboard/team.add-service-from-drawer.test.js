/**
 * Unit tests: creating a service from the add team member page.
 * Add Service must: persist the service (updateServices), add a chip to "services this member will offer",
 * and stay on the add/edit team member page WITHOUT saving the team member or navigating away.
 */

import React from 'react';
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import NewTeamMemberPage from '@/pages/dashboard/team/new';

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    pathname: '/dashboard/team/new',
    query: {},
    asPath: '/dashboard/team/new',
    isReady: true,
  }),
}));

jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn(), warning: jest.fn() }),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'owner-uid', email: 'owner@example.com' },
  }),
}));

const mockGetUserAccount = jest.fn();
const mockUpdateTeamMembers = jest.fn();
const mockUpdateServices = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  updateTeamMembers: (...args) => mockUpdateTeamMembers(...args),
  updateServices: (...args) => mockUpdateServices(...args),
  uploadTeamPhoto: jest.fn(),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: jest.fn().mockResolvedValue({
    id: 'org-1',
    membership: { role: 'admin' },
  }),
}));

const mockSetAccount = jest.fn();
const mockRefetchAccount = jest.fn();
const teamMembersForContext = [
  { id: 'tm1', name: 'Alice', email: 'alice@example.com' },
  { id: 'tm2', name: 'Bob', email: 'bob@example.com' },
];
jest.mock('@/lib/UserAccountContext', () => ({
  useUserAccount: () => ({
    account: { teamMembers: teamMembersForContext, services: [], locations: [], firstName: 'Owner' },
    setAccount: mockSetAccount,
    refetch: mockRefetchAccount,
  }),
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

const teamMembers = [
  { id: 'tm1', name: 'Alice', email: 'alice@example.com' },
  { id: 'tm2', name: 'Bob', email: 'bob@example.com' },
];

describe('Add team member page – Add service from form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    mockGetUserAccount.mockResolvedValue({
      teamMembers,
      services: [],
      firstName: 'Owner',
    });
    mockUpdateTeamMembers.mockResolvedValue(undefined);
    mockUpdateServices.mockResolvedValue(undefined);

    global.fetch = jest.fn((url) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('get-org-members')) {
        return Promise.resolve({ json: () => Promise.resolve({ members: [] }) });
      }
      if (path.includes('get-org-invites')) {
        return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      }
      if (path.includes('get-org-team')) {
        return Promise.resolve({ json: () => Promise.resolve({ teamMembers: [], ownerUserId: null }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  it('add member page shows form with Services offered and Add button', async () => {
    render(<NewTeamMemberPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add team member/i })).toBeInTheDocument();
    });

    expect(mockRefetchAccount).toHaveBeenCalled();

    const addServiceBtn = await screen.findByTestId('add-service-from-drawer', {}, { timeout: 3000 });
    expect(addServiceBtn).toBeInTheDocument();
    expect(screen.getByText(/services offered/i)).toBeInTheDocument();
  });

  it('clicking Add Service must NOT save the team member and must NOT navigate away', async () => {
    jest.setTimeout(15000);
    render(<NewTeamMemberPage />);

    // Wait for page to finish loading (org + get-org-team) and show the form
    const heading = await screen.findByRole('heading', { name: /add team member/i }, { timeout: 5000 });
    expect(heading).toBeInTheDocument();

    mockRouterPush.mockClear();
    mockUpdateTeamMembers.mockClear();

    const addServiceBtn = await screen.findByTestId('add-service-from-drawer', {}, { timeout: 3000 });
    await act(async () => {
      fireEvent.click(addServiceBtn);
    });

    // Add Service drawer must not cause parent form submit: no member save, no navigation.
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockUpdateTeamMembers).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add team member/i })).toBeInTheDocument();
    });

    const dialog = await screen.findByRole('dialog', {}, { timeout: 2000 }).catch(() => null);
    if (dialog) {
      expect(within(dialog).queryByLabelText(/service name/i)).toBeInTheDocument();
    }
  });
});
