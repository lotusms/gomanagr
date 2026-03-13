/**
 * Subscriptions page tests:
 * - Renders loading then content with trial status or plans
 * - Developer role sees "Free Trial Inactive" in green banner (no days remaining / expiration)
 * - Non-developer with active trial sees "Free Trial Active" with days remaining
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SubscriptionsPage from '@/pages/dashboard/subscriptions';

const mockGetUserAccount = jest.fn();
const mockGetUserOrganization = jest.fn();

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'user-1', email: 'dev@test.com' } }),
}));

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/dashboard/subscriptions' }),
}));

jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

jest.mock('@/components/subscriptions/SubscriptionPlansGrid', () => function MockSubscriptionPlansGrid() {
  return <div data-testid="subscription-plans-grid">Plans grid</div>;
});

describe('Subscriptions page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserAccount.mockResolvedValue({
      trial: true,
      trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'admin' },
    });
  });

  it('shows loading then content', async () => {
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('subscription-plans-grid')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /subscriptions/i })).toBeInTheDocument();
  });

  it('developer role sees Free Trial Inactive in green-style banner without days or expiration', async () => {
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'developer' },
    });
    mockGetUserAccount.mockResolvedValue({
      trial: true,
      trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    });

    render(<SubscriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Free Trial Inactive')).toBeInTheDocument();
    });

    const greenBanner = screen.getByText('Free Trial Inactive').closest('.bg-green-50');
    expect(greenBanner).toBeInTheDocument();

    expect(screen.queryByText(/days remaining/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ends on/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('non-developer with active trial sees Free Trial Active with days remaining', async () => {
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'superadmin' },
    });
    const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    mockGetUserAccount.mockResolvedValue({
      trial: true,
      trialEndsAt: futureEnd.toISOString(),
    });

    render(<SubscriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Free Trial Active')).toBeInTheDocument();
    });

    expect(screen.getByText(/days remaining/i)).toBeInTheDocument();
    expect(screen.getByText(/ends on/i)).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
