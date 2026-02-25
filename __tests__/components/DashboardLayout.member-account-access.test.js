import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UserAccountProvider } from '@/lib/UserAccountContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';

const mockReplace = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/account',
    replace: mockReplace,
    push: jest.fn(),
  }),
}));

const mockLogout = jest.fn();
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user-1', email: 'member@example.com' },
    logout: mockLogout,
  }),
}));

jest.mock('@/services/userService', () => ({
  getUserAccount: () => Promise.resolve({ firstName: 'Member', lastName: 'User' }),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: () =>
    Promise.resolve({
      membership: { role: 'member' },
      logo_url: null,
    }),
}));

// Suppress fetch for get-org-member-access (memberAccess can stay null; /account is baseAllowed)
global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }));

describe('DashboardLayout member access to My Account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows member on /account without redirecting to team-member', async () => {
    render(
      <UserAccountProvider>
        <DashboardLayout>
          <div data-testid="account-content">My Account page content</div>
        </DashboardLayout>
      </UserAccountProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('account-content')).toBeInTheDocument();
    });

    // Member should stay on /account; must not be redirected to /dashboard/team-member
    expect(mockReplace).not.toHaveBeenCalledWith('/dashboard/team-member');
  });
});
