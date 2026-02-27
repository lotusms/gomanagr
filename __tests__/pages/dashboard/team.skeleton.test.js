/**
 * Team page – Loading skeleton
 * - When load completes in under 1s: no skeleton (Loading… then content, or content only).
 * - When load takes at least 1s: skeleton is shown until content is ready.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
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

jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn(), warning: jest.fn() }),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'owner-uid', email: 'owner@example.com' },
  }),
}));

const mockGetUserAccount = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  updateTeamMembers: jest.fn(),
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

const mockTeamData = {
  teamMembers: [{ id: 'tm1', name: 'Alice', email: 'alice@example.com' }],
  firstName: 'Owner',
};

describe('Team page – Loading skeleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'owner' },
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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows Loading… then content when load completes before 1 second (no skeleton)', async () => {
    mockGetUserAccount.mockResolvedValue(mockTeamData);

    render(<TeamPage />);

    expect(screen.getByText(/loading…/i)).toBeInTheDocument();
    expect(screen.queryByTestId('team-page-skeleton')).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('team-page-skeleton')).not.toBeInTheDocument();
    expect(screen.queryByText(/loading…/i)).not.toBeInTheDocument();
  });

  it('shows skeleton after 1 second when load is slow, then content when loaded', async () => {
    let resolveGetUserAccount;
    mockGetUserAccount.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGetUserAccount = resolve;
        })
    );

    render(<TeamPage />);

    expect(screen.getByText(/loading…/i)).toBeInTheDocument();
    expect(screen.queryByTestId('team-page-skeleton')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('team-page-skeleton')).toBeInTheDocument();
    expect(screen.queryByText(/loading…/i)).not.toBeInTheDocument();

    resolveGetUserAccount(mockTeamData);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('team-page-skeleton')).not.toBeInTheDocument();
  });
});
