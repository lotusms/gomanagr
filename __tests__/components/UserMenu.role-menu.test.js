import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserMenu from '@/components/layouts/UserMenu';

const mockOnLogout = jest.fn();

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/AuthContext', () => ({ useAuth: () => ({}), AuthProvider: ({ children }) => children }));
jest.mock('@/services/userService', () => ({ getUserAccount: () => Promise.resolve(null) }));

const mockIsAdminOrDeveloper = jest.fn(() => false);
jest.mock('@/lib/userPermissions', () => ({
  isAdminOrDeveloper: (...args) => mockIsAdminOrDeveloper(...args),
}));

const defaultUserAccount = { firstName: 'Test', lastName: 'User', nameView: 'full' };
const defaultCurrentUser = { email: 'test@example.com', uid: 'user-1' };

function renderUserMenu({
  organization,
  isOwner = false,
  userAccount = defaultUserAccount,
  currentUser = defaultCurrentUser,
} = {}) {
  return render(
    <UserMenu
      userAccount={userAccount}
      currentUser={currentUser}
      organization={organization}
      isOwner={isOwner}
      onLogout={mockOnLogout}
      headerReady={true}
    />
  );
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
}

/** Assert the dropdown has exactly these links (by href) and exactly one Logout button. No more, no less. */
function expectExactlyTheseLinksAndLogout(expectedHrefs) {
  const links = screen.getAllByRole('link');
  expect(links).toHaveLength(expectedHrefs.length);
  const hrefs = links.map((l) => l.getAttribute('href')).sort();
  const expected = [...expectedHrefs].sort();
  expect(hrefs).toEqual(expected);

  const logoutButtons = screen.getAllByRole('button', { name: /logout/i });
  expect(logoutButtons).toHaveLength(1);
}

describe('UserMenu role-based menu items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('superadmin: exactly Super Admin badge, My Account, Subscriptions, Settings, Logout (no Developer in test env)', () => {
    renderUserMenu({
      organization: { membership: { role: 'superadmin' } },
      isOwner: true,
    });
    openMenu();

    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('link', { name: /subscriptions/i })).toHaveAttribute('href', '/dashboard/subscriptions');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/dashboard/settings');
    expect(screen.queryByRole('link', { name: /developer/i })).not.toBeInTheDocument();

    expectExactlyTheseLinksAndLogout(['/account', '/dashboard/subscriptions', '/dashboard/settings']);
  });

  it('superadmin in development: exactly Super Admin badge, My Account, Subscriptions, Settings, Developer, Logout', () => {
    mockIsAdminOrDeveloper.mockReturnValue(true);
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      renderUserMenu({
        organization: { membership: { role: 'superadmin' } },
        isOwner: true,
      });
      openMenu();

      expect(screen.getByText('Super Admin')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/account');
      expect(screen.getByRole('link', { name: /subscriptions/i })).toHaveAttribute('href', '/dashboard/subscriptions');
      expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/dashboard/settings');
      expect(screen.getByRole('link', { name: /developer/i })).toHaveAttribute('href', '/dashboard/developer');
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();

      expectExactlyTheseLinksAndLogout([
        '/account',
        '/dashboard/subscriptions',
        '/dashboard/settings',
        '/dashboard/developer',
      ]);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      mockIsAdminOrDeveloper.mockReturnValue(false);
    }
  });

  it('admin: exactly Admin badge, My Account, Settings, Logout (no Subscriptions, no Developer in test env)', () => {
    renderUserMenu({
      organization: { membership: { role: 'admin' } },
      isOwner: false,
    });
    openMenu();

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/dashboard/settings');
    expect(screen.queryByRole('link', { name: /subscriptions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /developer/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Super Admin')).not.toBeInTheDocument();

    expectExactlyTheseLinksAndLogout(['/account', '/dashboard/settings']);
  });

  it('developer role: exactly Admin badge, My Account, Settings, Logout (same as admin)', () => {
    renderUserMenu({
      organization: { membership: { role: 'developer' } },
      isOwner: false,
    });
    openMenu();

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/dashboard/settings');
    expect(screen.queryByRole('link', { name: /subscriptions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /developer/i })).not.toBeInTheDocument();

    expectExactlyTheseLinksAndLogout(['/account', '/dashboard/settings']);
  });

  it('member: exactly My Account, Logout (no badge, no Subscriptions, no Settings, no Developer)', () => {
    renderUserMenu({
      organization: { membership: { role: 'member' } },
      isOwner: false,
    });
    openMenu();

    expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();

    expect(screen.queryByText('Super Admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /subscriptions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /developer/i })).not.toBeInTheDocument();

    expectExactlyTheseLinksAndLogout(['/account']);
  });

  it('no membership: exactly My Account, Logout (no badge, no other links)', () => {
    renderUserMenu({
      organization: {},
      isOwner: false,
    });
    openMenu();

    expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();

    expect(screen.queryByText('Super Admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /subscriptions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /developer/i })).not.toBeInTheDocument();

    expectExactlyTheseLinksAndLogout(['/account']);
  });
});
