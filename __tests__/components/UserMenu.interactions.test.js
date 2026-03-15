/**
 * Unit tests for UserMenu: click outside, Logout, dev role toggle, link onClick (menu close).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserMenu from '@/components/layouts/UserMenu';

const mockOnLogout = jest.fn();
const mockReload = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), reload: mockReload, pathname: '/dashboard' }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/AuthContext', () => ({ useAuth: () => ({}), AuthProvider: ({ children }) => children }));
jest.mock('@/services/userService', () => ({ getUserAccount: () => Promise.resolve(null) }));

const mockIsAdminOrDeveloper = jest.fn(() => false);
jest.mock('@/lib/userPermissions', () => ({
  isAdminOrDeveloper: (...args) => mockIsAdminOrDeveloper(...args),
}));

const ALLOWED_UID = 'd5107c55-56d1-480d-9274-30dd2d66665f';
const defaultUserAccount = { firstName: 'Test', lastName: 'User', nameView: 'full' };

function renderUserMenu({
  organization = { membership: { role: 'member' } },
  userAccount = defaultUserAccount,
  currentUser = { email: 'test@example.com', uid: 'user-1' },
} = {}) {
  return render(
    <UserMenu
      userAccount={userAccount}
      currentUser={currentUser}
      organization={organization}
      onLogout={mockOnLogout}
      headerReady={true}
    />
  );
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
}

describe('UserMenu interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnLogout.mockResolvedValue(undefined);
  });

  it('clicking Logout calls onLogout and closes menu', async () => {
    renderUserMenu();
    openMenu();
    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutBtn);
    expect(mockOnLogout).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(screen.queryByRole('link', { name: /my account/i })).not.toBeInTheDocument();
  });

  it('click outside closes menu', () => {
    render(
      <>
        <div data-testid="outside">Outside</div>
        <UserMenu
          userAccount={defaultUserAccount}
          currentUser={{ email: 'a@b.com', uid: 'u1' }}
          organization={{ membership: { role: 'member' } }}
          onLogout={mockOnLogout}
          headerReady={true}
        />
      </>
    );
    openMenu();
    expect(screen.getByRole('link', { name: /my account/i })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('link', { name: /my account/i })).not.toBeInTheDocument();
  });

  it('clicking My Account link closes menu', () => {
    renderUserMenu();
    openMenu();
    fireEvent.click(screen.getByRole('link', { name: /my account/i }));
    expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument();
  });

  it('clicking Subscriptions link closes menu', () => {
    renderUserMenu({ organization: { membership: { role: 'superadmin' } } });
    openMenu();
    fireEvent.click(screen.getByRole('link', { name: /subscriptions/i }));
    expect(screen.queryByRole('link', { name: /subscriptions/i })).not.toBeInTheDocument();
  });

  it('clicking Settings link closes menu', () => {
    renderUserMenu({ organization: { membership: { role: 'admin' } } });
    openMenu();
    fireEvent.click(screen.getByRole('link', { name: /settings/i }));
    expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument();
  });

  it('clicking Developer link closes menu when visible', () => {
    mockIsAdminOrDeveloper.mockReturnValue(true);
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      renderUserMenu({ organization: { membership: { role: 'superadmin' } } });
      openMenu();
      fireEvent.click(screen.getByRole('link', { name: /developer/i }));
      expect(screen.queryByRole('link', { name: /developer/i })).not.toBeInTheDocument();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      mockIsAdminOrDeveloper.mockReturnValue(false);
    }
  });

  it('clicking Backups link closes menu', () => {
    renderUserMenu({ organization: { membership: { role: 'admin' } } });
    openMenu();
    fireEvent.click(screen.getByRole('link', { name: /backups/i }));
    expect(screen.queryByRole('link', { name: /backups/i })).not.toBeInTheDocument();
  });

  it('dev toggle: Switch to Developer visible for allowed user as superadmin', () => {
    renderUserMenu({
      organization: { id: 'org-1', membership: { role: 'superadmin' } },
      currentUser: { email: 'dev@test.com', uid: ALLOWED_UID },
    });
    openMenu();
    expect(screen.getByRole('button', { name: /switch to developer/i })).toBeInTheDocument();
  });

  it('dev toggle: Switch to Super Admin visible for allowed user as developer', () => {
    renderUserMenu({
      organization: { id: 'org-1', membership: { role: 'developer' } },
      currentUser: { email: 'dev@test.com', uid: ALLOWED_UID },
    });
    openMenu();
    expect(screen.getByRole('button', { name: /switch to super admin/i })).toBeInTheDocument();
  });

  it('dev toggle: success calls router.reload', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    renderUserMenu({
      organization: { id: 'org-1', membership: { role: 'superadmin' } },
      currentUser: { email: 'dev@test.com', uid: ALLOWED_UID },
    });
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /switch to developer/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/toggle-dev-role', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: ALLOWED_UID, organizationId: 'org-1' }),
      }));
      expect(mockReload).toHaveBeenCalled();
    });
    global.fetch = originalFetch;
  });

  it('dev toggle: failure shows alert', async () => {
    const originalFetch = global.fetch;
    const originalAlert = global.alert;
    global.alert = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Not allowed' }),
    });
    renderUserMenu({
      organization: { id: 'org-1', membership: { role: 'superadmin' } },
      currentUser: { email: 'dev@test.com', uid: ALLOWED_UID },
    });
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /switch to developer/i }));
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Not allowed');
    });
    expect(mockReload).not.toHaveBeenCalled();
    global.fetch = originalFetch;
    global.alert = originalAlert;
  });

  it('dev toggle: fetch throws uses err.message in alert', async () => {
    const originalFetch = global.fetch;
    const originalAlert = global.alert;
    global.alert = jest.fn();
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderUserMenu({
      organization: { id: 'org-1', membership: { role: 'superadmin' } },
      currentUser: { email: 'dev@test.com', uid: ALLOWED_UID },
    });
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /switch to developer/i }));
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Network error');
    });
    consoleSpy.mockRestore();
    global.fetch = originalFetch;
    global.alert = originalAlert;
  });
});
