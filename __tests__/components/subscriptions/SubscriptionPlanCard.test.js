/**
 * Unit tests for SubscriptionPlanCard: render, pricing display, onSubscribe, popular/customPricing
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionPlanCard from '@/components/subscriptions/SubscriptionPlanCard';

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick }) => (
    <button type="button" onClick={onClick} data-testid="subscribe-btn">{children}</button>
  ),
}));

jest.mock('react-icons/hi', () => ({
  HiCheck: () => <span data-testid="hi-check">✓</span>,
}));

const defaultPlan = {
  id: 'starter',
  name: 'Starter',
  monthlyPrice: 49,
  yearlyPrice: 499.8,
  yearlyPricePerMonth: 41.65,
  description: 'Perfect for small teams',
  features: ['Up to 3 team members', 'Unlimited clients'],
  popular: false,
};

const formatPrice = (price) => `$${Number(price).toFixed(0)}`;

describe('SubscriptionPlanCard', () => {
  it('renders plan name and description', () => {
    render(
      <SubscriptionPlanCard
        plan={defaultPlan}
        billingPeriod="Monthly"
        onSubscribe={jest.fn()}
        formatPrice={formatPrice}
      />
    );
    expect(screen.getByRole('heading', { name: 'Starter' })).toBeInTheDocument();
    expect(screen.getByText('Perfect for small teams')).toBeInTheDocument();
  });

  it('renders monthly price when billingPeriod is Monthly', () => {
    render(
      <SubscriptionPlanCard
        plan={defaultPlan}
        billingPeriod="Monthly"
        onSubscribe={jest.fn()}
        formatPrice={formatPrice}
      />
    );
    expect(screen.getByText('$49')).toBeInTheDocument();
    expect(screen.getByText(/\/month/)).toBeInTheDocument();
  });

  it('renders yearly price per month when billingPeriod is Annually', () => {
    render(
      <SubscriptionPlanCard
        plan={defaultPlan}
        billingPeriod="Annually"
        onSubscribe={jest.fn()}
        formatPrice={formatPrice}
      />
    );
    expect(screen.getByText('$42')).toBeInTheDocument();
    expect(screen.getByText(/\/month/)).toBeInTheDocument();
    expect(screen.getByText(/Save \$/)).toBeInTheDocument();
  });

  it('calls onSubscribe with plan.id and period when button is clicked', async () => {
    const onSubscribe = jest.fn();
    render(
      <SubscriptionPlanCard
        plan={defaultPlan}
        billingPeriod="Monthly"
        onSubscribe={onSubscribe}
        formatPrice={formatPrice}
      />
    );
    await userEvent.click(screen.getByTestId('subscribe-btn'));
    expect(onSubscribe).toHaveBeenCalledWith('starter', 'monthly');
  });

  it('calls onSubscribe with annually when billingPeriod is Annually', async () => {
    const onSubscribe = jest.fn();
    render(
      <SubscriptionPlanCard
        plan={defaultPlan}
        billingPeriod="Annually"
        onSubscribe={onSubscribe}
        formatPrice={formatPrice}
      />
    );
    await userEvent.click(screen.getByTestId('subscribe-btn'));
    expect(onSubscribe).toHaveBeenCalledWith('starter', 'annually');
  });

  it('shows Most Popular badge when plan.popular is true', () => {
    render(
      <SubscriptionPlanCard
        plan={{ ...defaultPlan, popular: true }}
        billingPeriod="Monthly"
        onSubscribe={jest.fn()}
        formatPrice={formatPrice}
      />
    );
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
    expect(screen.getByTestId('subscribe-btn')).toHaveTextContent('Get Started');
  });

  it('shows Contact Sales and Lets Talk when plan.customPricing is true', () => {
    const customPlan = {
      ...defaultPlan,
      id: 'enterprise',
      name: 'Enterprise',
      customPricing: true,
    };
    render(
      <SubscriptionPlanCard
        plan={customPlan}
        billingPeriod="Monthly"
        onSubscribe={jest.fn()}
        formatPrice={formatPrice}
      />
    );
    expect(screen.getByText("Let's Talk")).toBeInTheDocument();
    expect(screen.getByTestId('subscribe-btn')).toHaveTextContent('Contact Sales');
  });

  it('renders all plan features', () => {
    render(
      <SubscriptionPlanCard
        plan={defaultPlan}
        billingPeriod="Monthly"
        onSubscribe={jest.fn()}
        formatPrice={formatPrice}
      />
    );
    expect(screen.getByText('Up to 3 team members')).toBeInTheDocument();
    expect(screen.getByText('Unlimited clients')).toBeInTheDocument();
  });

  it('does not throw when onSubscribe is omitted', async () => {
    render(
      <SubscriptionPlanCard
        plan={defaultPlan}
        billingPeriod="Monthly"
        formatPrice={formatPrice}
      />
    );
    await userEvent.click(screen.getByTestId('subscribe-btn'));
  });
});
