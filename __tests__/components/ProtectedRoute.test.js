/**
 * Unit tests for ProtectedRoute:
 * - Shows loading state when auth or account is loading
 * - Redirects to /login when not authenticated
 * - Renders Paywall when trial expired and user on trial
 * - Renders children when authenticated and not trial expired
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '@/components/ProtectedRoute';

const mockReplace = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockUseAuth = jest.fn(() => ({ currentUser: null, loading: false }));
jest.mock('@/lib/AuthContext', () => ({
  useAuth: (...args) => mockUseAuth(...args),
}));

const mockGetUserAccount = jest.fn(() => Promise.resolve(null));
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
}));

const mockGetTrialStatus = jest.fn(() => ({ expired: false }));
jest.mock('@/lib/trialUtils', () => ({
  getTrialStatus: (...args) => mockGetTrialStatus(...args),
}));

jest.mock('@/components/subscriptions/Paywall', () => {
  return function MockPaywall() {
    return <div data-testid="paywall">Paywall</div>;
  };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ currentUser: null, loading: false });
    mockGetUserAccount.mockResolvedValue(null);
    mockGetTrialStatus.mockReturnValue({ expired: false });
  });

  it('redirects to /login when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ currentUser: null, loading: false });

    render(
      <ProtectedRoute>
        <span>Protected content</span>
      </ProtectedRoute>
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('shows loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({ currentUser: null, loading: true });

    render(
      <ProtectedRoute>
        <span>Protected content</span>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders children when authenticated and not trial expired', async () => {
    mockUseAuth.mockReturnValue({ currentUser: { uid: 'u1' }, loading: false });
    mockGetUserAccount.mockResolvedValue({ trial: false });

    render(
      <ProtectedRoute>
        <span>Protected content</span>
      </ProtectedRoute>
    );

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });

  it('renders Paywall when trial expired and user on trial', async () => {
    mockUseAuth.mockReturnValue({ currentUser: { uid: 'u1' }, loading: false });
    mockGetUserAccount.mockResolvedValue({ trial: true });
    mockGetTrialStatus.mockReturnValue({ expired: true });

    render(
      <ProtectedRoute>
        <span>Protected content</span>
      </ProtectedRoute>
    );

    expect(await screen.findByTestId('paywall')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
});
