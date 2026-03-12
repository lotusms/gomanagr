/**
 * Unit tests for SubscriptionPlansGrid: render, title, billing period switch, plans rendered
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionPlansGrid from '@/components/subscriptions/SubscriptionPlansGrid';

jest.mock('@/components/ui', () => ({
  ChipsSingle: ({ id, options, value, onValueChange }) => (
    <div data-testid="chips-billing">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onValueChange(opt)}
          data-value={opt}
          aria-pressed={value === opt}
        >
          {opt}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('@/data/subscriptionPlans', () => ({
  subscriptionPlans: [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 49,
      yearlyPrice: 499.8,
      yearlyPricePerMonth: 41.65,
      description: 'Perfect for small teams',
      features: ['Feature A'],
      popular: false,
    },
    {
      id: 'growth',
      name: 'Growth',
      monthlyPrice: 99,
      yearlyPrice: 1009.8,
      yearlyPricePerMonth: 84.15,
      description: 'For growing businesses',
      features: ['Feature B'],
      popular: true,
    },
  ],
}));

jest.mock('@/components/subscriptions/SubscriptionPlanCard', () => {
  return function MockSubscriptionPlanCard({ plan, billingPeriod, onSubscribe, formatPrice }) {
    return (
      <div data-testid={`plan-${plan.id}`}>
        <span data-testid={`plan-name-${plan.id}`}>{plan.name}</span>
        <span data-billing={billingPeriod}>{billingPeriod}</span>
        <button type="button" onClick={() => onSubscribe && onSubscribe(plan.id, billingPeriod)}>
          Subscribe
        </button>
      </div>
    );
  };
});

describe('SubscriptionPlansGrid', () => {
  it('renders default title', () => {
    render(<SubscriptionPlansGrid onSubscribe={jest.fn()} formatPrice={(p) => `$${p}`} />);
    expect(screen.getByRole('heading', { name: 'Find the plan for you' })).toBeInTheDocument();
  });

  it('renders custom title when provided', () => {
    render(
      <SubscriptionPlansGrid
        title="Choose a plan"
        onSubscribe={jest.fn()}
        formatPrice={(p) => `$${p}`}
      />
    );
    expect(screen.getByRole('heading', { name: 'Choose a plan' })).toBeInTheDocument();
  });

  it('renders billing period chips with Monthly and Annually', () => {
    render(<SubscriptionPlansGrid onSubscribe={jest.fn()} formatPrice={(p) => `$${p}`} />);
    expect(screen.getByTestId('chips-billing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annually' })).toBeInTheDocument();
  });

  it('renders all subscription plans', () => {
    render(<SubscriptionPlansGrid onSubscribe={jest.fn()} formatPrice={(p) => `$${p}`} />);
    expect(screen.getByTestId('plan-starter')).toBeInTheDocument();
    expect(screen.getByTestId('plan-growth')).toBeInTheDocument();
    expect(screen.getByTestId('plan-name-starter')).toHaveTextContent('Starter');
    expect(screen.getByTestId('plan-name-growth')).toHaveTextContent('Growth');
  });

  it('passes Monthly as billing period by default', () => {
    render(<SubscriptionPlansGrid onSubscribe={jest.fn()} formatPrice={(p) => `$${p}`} />);
    const starterCard = screen.getByTestId('plan-starter');
    expect(starterCard.querySelector('[data-billing="Monthly"]')).toBeInTheDocument();
  });

  it('switches to Annually when Annually chip is clicked', async () => {
    render(<SubscriptionPlansGrid onSubscribe={jest.fn()} formatPrice={(p) => `$${p}`} />);
    await userEvent.click(screen.getByRole('button', { name: 'Annually' }));
    const starterCard = screen.getByTestId('plan-starter');
    expect(starterCard.querySelector('[data-billing="Annually"]')).toBeInTheDocument();
  });

  it('shows save message when Annually is selected', async () => {
    render(<SubscriptionPlansGrid onSubscribe={jest.fn()} formatPrice={(p) => `$${p}`} />);
    expect(screen.queryByText(/Save 15%/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Annually' }));
    expect(screen.getByText(/Save 15% with annual billing/)).toBeInTheDocument();
  });

  it('calls onSubscribe when a plan subscribe button is clicked', async () => {
    const onSubscribe = jest.fn();
    render(<SubscriptionPlansGrid onSubscribe={onSubscribe} formatPrice={(p) => `$${p}`} />);
    const subscribeButtons = screen.getAllByRole('button', { name: 'Subscribe' });
    await userEvent.click(subscribeButtons[0]);
    expect(onSubscribe).toHaveBeenCalledWith('starter', 'Monthly');
  });
});
