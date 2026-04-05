/**
 * Unit tests for Paywall: trial expired vs days remaining, features, onSubscribe, formatPrice
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Paywall from '@/components/subscriptions/Paywall';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockLogout = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

jest.mock('react-icons/hi', () => ({
  HiLockClosed: () => <span data-testid="lock-icon">lock</span>,
  HiCheck: () => <span data-testid="check-icon">check</span>,
}));

jest.mock('@/components/subscriptions/SubscriptionPlansGrid', () => {
  return function MockSubscriptionPlansGrid({ onSubscribe, formatPrice }) {
    return (
      <div data-testid="plans-grid">
        <span data-testid="formatted-price">{formatPrice(49)}</span>
        <button type="button" onClick={() => onSubscribe('growth', 'monthly')}>
          Subscribe
        </button>
      </div>
    );
  };
});

describe('Paywall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
  });

  it('renders trial expired message when trialEndsAt is in the past', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    render(
      <Paywall userAccount={{ trialEndsAt: pastDate.toISOString() }} />
    );
    expect(screen.getByRole('heading', { name: 'Your Trial Has Expired' })).toBeInTheDocument();
    expect(screen.getByText(/Subscribe to continue using GoManagr/)).toBeInTheDocument();
  });

  it('renders days remaining when trialEndsAt is in the future', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    render(
      <Paywall userAccount={{ trialEndsAt: futureDate.toISOString() }} />
    );
    expect(screen.getByRole('heading', { name: /Trial Expires in 5 Days/ })).toBeInTheDocument();
    expect(screen.getByText(/Subscribe now to ensure uninterrupted access/)).toBeInTheDocument();
  });

  it('renders "1 Day" when one day remaining', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    render(
      <Paywall userAccount={{ trialEndsAt: futureDate.toISOString() }} />
    );
    expect(screen.getByRole('heading', { name: /Trial Expires in 1 Day/ })).toBeInTheDocument();
  });

  it('treats trial true without trialEndsAt as expired', () => {
    render(<Paywall userAccount={{ trial: true }} />);
    expect(screen.getByRole('heading', { name: 'Your Trial Has Expired' })).toBeInTheDocument();
  });

  it('renders features list', () => {
    render(<Paywall userAccount={{ trialEndsAt: new Date().toISOString() }} />);
    expect(screen.getByText('Unlimited clients and projects')).toBeInTheDocument();
    expect(screen.getByText('Advanced reporting and analytics')).toBeInTheDocument();
    expect(screen.getByText('Priority support')).toBeInTheDocument();
  });

  it('renders SubscriptionPlansGrid with formatPrice that strips .00', () => {
    render(<Paywall userAccount={{}} />);
    expect(screen.getByTestId('formatted-price')).toHaveTextContent('$49');
  });

  it('calls onSubscribe when grid triggers subscribe and onSubscribe prop is provided', async () => {
    const onSubscribe = jest.fn();
    render(<Paywall userAccount={{}} onSubscribe={onSubscribe} />);
    await userEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(onSubscribe).toHaveBeenCalled();
  });

  it('navigates to /dashboard/subscriptions when subscribe clicked and no onSubscribe prop', async () => {
    render(<Paywall userAccount={{}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/subscriptions');
  });

  it('renders footer note', () => {
    render(<Paywall userAccount={{}} />);
    expect(screen.getByText(/30-day money-back guarantee/)).toBeInTheDocument();
  });

  it('when trial expired, offers sign out to return to login', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    render(
      <Paywall userAccount={{ trialEndsAt: pastDate.toISOString() }} />
    );
    expect(
      screen.getByRole('button', { name: 'Sign out and return to login' })
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Sign out and return to login' })
    );
    expect(mockLogout).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('does not show sign-out link when trial has days remaining', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    render(
      <Paywall userAccount={{ trialEndsAt: futureDate.toISOString() }} />
    );
    expect(
      screen.queryByRole('button', { name: 'Sign out and return to login' })
    ).not.toBeInTheDocument();
  });
});
