import React, { useState, useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { getUserOrganization } from '@/services/organizationService';
import { isOwnerRole, isAdminRole, isMemberRole, ORG_ROLE } from '@/config/rolePermissions';

const mockGetUserOrganization = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (userId) => mockGetUserOrganization(userId),
}));

/** Mimics post-login role loading: fetches org and displays membership role. */
function RoleAfterLogin() {
  const { currentUser } = useAuth();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getUserOrganization(currentUser.uid)
      .then((org) => {
        setRole(org?.membership?.role ?? null);
      })
      .catch(() => setRole(null))
      .finally(() => setLoading(false));
  }, [currentUser?.uid]);

  if (loading) return <span data-testid="role-loading">Loading role...</span>;
  if (role == null) return <span data-testid="role-value">none</span>;
  const isOwner = isOwnerRole(role);
  const isAdmin = isAdminRole(role);
  const isMember = isMemberRole(role);
  return (
    <div data-testid="role-loaded">
      <span data-testid="role-value">{role}</span>
      <span data-testid="role-is-owner">{String(isOwner)}</span>
      <span data-testid="role-is-admin">{String(isAdmin)}</span>
      <span data-testid="role-is-member">{String(isMember)}</span>
    </div>
  );
}

describe('Role loading after login', () => {
  const sessionWithUser = {
    data: {
      session: {
        user: { id: 'user-1', email: 'user@example.com' },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('@/lib/supabase').supabase.auth.getSession.mockResolvedValue(sessionWithUser);
  });

  it('shows loading state while role is being fetched', async () => {
    mockGetUserOrganization.mockImplementation(() => new Promise(() => {}));

    render(
      <AuthProvider>
        <RoleAfterLogin />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('role-loading')).toBeInTheDocument();
    });
    expect(screen.getByText(/loading role/i)).toBeInTheDocument();
  });

  it('loads and displays superadmin role after login', async () => {
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      name: 'Test Org',
      membership: { id: 'mem-1', role: ORG_ROLE.SUPERADMIN },
    });

    render(
      <AuthProvider>
        <RoleAfterLogin />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('role-loaded')).toBeInTheDocument();
    });

    expect(screen.getByTestId('role-value')).toHaveTextContent('superadmin');
    expect(screen.getByTestId('role-is-owner')).toHaveTextContent('true');
    expect(screen.getByTestId('role-is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('role-is-member')).toHaveTextContent('false');
    expect(mockGetUserOrganization).toHaveBeenCalledWith('user-1');
  });

  it('loads and displays admin role after login', async () => {
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      name: 'Test Org',
      membership: { id: 'mem-1', role: ORG_ROLE.ADMIN },
    });

    render(
      <AuthProvider>
        <RoleAfterLogin />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('role-value')).toHaveTextContent('admin');
    });

    expect(screen.getByTestId('role-is-owner')).toHaveTextContent('false');
    expect(screen.getByTestId('role-is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('role-is-member')).toHaveTextContent('false');
    expect(mockGetUserOrganization).toHaveBeenCalledWith('user-1');
  });

  it('loads and displays member role after login', async () => {
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      name: 'Test Org',
      membership: { id: 'mem-1', role: ORG_ROLE.MEMBER },
    });

    render(
      <AuthProvider>
        <RoleAfterLogin />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('role-value')).toHaveTextContent('member');
    });

    expect(screen.getByTestId('role-is-owner')).toHaveTextContent('false');
    expect(screen.getByTestId('role-is-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('role-is-member')).toHaveTextContent('true');
    expect(mockGetUserOrganization).toHaveBeenCalledWith('user-1');
  });

  it('loads and displays developer role after login', async () => {
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      name: 'Test Org',
      membership: { id: 'mem-1', role: ORG_ROLE.DEVELOPER },
    });

    render(
      <AuthProvider>
        <RoleAfterLogin />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('role-value')).toHaveTextContent('developer');
    });

    expect(screen.getByTestId('role-is-owner')).toHaveTextContent('false');
    expect(screen.getByTestId('role-is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('role-is-member')).toHaveTextContent('false');
  });
});
