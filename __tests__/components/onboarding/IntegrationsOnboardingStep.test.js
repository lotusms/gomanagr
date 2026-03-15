/**
 * Unit tests for IntegrationsOnboardingStep: optional title/description, IntegrationsSettings.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import IntegrationsOnboardingStep from '@/components/onboarding/IntegrationsOnboardingStep';

jest.mock('@/components/settings/IntegrationsSettings', () => function MockIntegrationsSettings() {
  return <div data-testid="integrations-settings">IntegrationsSettings</div>;
});

describe('IntegrationsOnboardingStep', () => {
  it('renders IntegrationsSettings', () => {
    render(<IntegrationsOnboardingStep />);
    expect(screen.getByTestId('integrations-settings')).toBeInTheDocument();
  });

  it('does not render title or description block when both are omitted', () => {
    render(<IntegrationsOnboardingStep />);
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(screen.getByTestId('integrations-settings')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<IntegrationsOnboardingStep title="Connect your tools" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Connect your tools' })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<IntegrationsOnboardingStep description="Set up Stripe, Twilio, and more." />);
    expect(screen.getByText('Set up Stripe, Twilio, and more.')).toBeInTheDocument();
  });

  it('renders both title and description when provided', () => {
    render(
      <IntegrationsOnboardingStep
        title="Integrations"
        description="Configure API keys for payments and messaging."
      />
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Integrations' })).toBeInTheDocument();
    expect(screen.getByText('Configure API keys for payments and messaging.')).toBeInTheDocument();
  });
});
