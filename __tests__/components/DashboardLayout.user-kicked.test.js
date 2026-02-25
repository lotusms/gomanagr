/**
 * Unit tests for immediate kick: DashboardLayout subscribes to org channel
 * and logs out + redirects when it receives user-kicked broadcast for current user.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { UserAccountProvider } from '@/lib/UserAccountContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';

const mockReplace = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/dashboard/team',
    replace: mockReplace,
    push: jest.fn(),
  }),
}));

const mockLogout = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'kicked-user-uid', email: 'kicked@example.com' },
    logout: mockLogout,
  }),
}));

jest.mock('@/services/userService', () => ({
  getUserAccount: () => Promise.resolve({ firstName: 'User', teamMembers: [] }),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: () =>
    Promise.resolve({
      id: 'org-1',
      membership: { role: 'member' },
      logo_url: null,
    }),
}));

let broadcastCallbacks = {};
const mockChannel = {
  on: jest.fn((_type, config, callback) => {
    if (config?.event && typeof callback === 'function') {
      broadcastCallbacks[config.event] = callback;
    }
    return mockChannel;
  }),
  subscribe: jest.fn(() => mockChannel),
  unsubscribe: jest.fn(),
  send: jest.fn(),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => mockChannel),
  },
}));

global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ teamMemberSections: {} }) }));

describe('DashboardLayout user-kicked broadcast', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    broadcastCallbacks = {};
    delete window.location;
    window.location = {
      ...originalLocation,
      href: '',
      replace: jest.fn(),
    };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('logs out and redirects to /login?revoked=1 when receiving user-kicked for current user', async () => {
    render(
      <UserAccountProvider>
        <DashboardLayout>
          <div data-testid="dashboard-children">Dashboard content</div>
        </DashboardLayout>
      </UserAccountProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-children')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(broadcastCallbacks['user-kicked']).toBeDefined();
    });
    const userKickedCallback = broadcastCallbacks['user-kicked'];

    await act(async () => {
      userKickedCallback({ payload: { userId: 'kicked-user-uid' } });
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
    expect(window.location.href).toBe('/login?revoked=1');
  });

  it('does not logout when user-kicked payload userId is different from current user', async () => {
    render(
      <UserAccountProvider>
        <DashboardLayout>
          <div data-testid="dashboard-children">Dashboard content</div>
        </DashboardLayout>
      </UserAccountProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-children')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(broadcastCallbacks['user-kicked']).toBeDefined();
    });
    const userKickedCallback = broadcastCallbacks['user-kicked'];

    await act(async () => {
      userKickedCallback({ payload: { userId: 'other-user-uid' } });
    });

    expect(mockLogout).not.toHaveBeenCalled();
    expect(window.location.href).toBe('');
  });
});
