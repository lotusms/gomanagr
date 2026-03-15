/**
 * Unit tests for ProviderInfoCard: display name, status badge, capabilities, warning.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ProviderInfoCard from '@/components/marketing/ProviderInfoCard';

jest.mock('@/components/marketing/ProviderStatusBadge', () => function MockProviderStatusBadge({ status }) {
  return <span data-testid="status-badge">{status}</span>;
});
jest.mock('@/components/marketing/ProviderCapabilityBadges', () => function MockProviderCapabilityBadges({ capabilities }) {
  return <span data-testid="capability-badges">{capabilities ? JSON.stringify(capabilities) : 'none'}</span>;
});
jest.mock('@/lib/marketing/providerRegistry', () => ({
  PROVIDER_DISPLAY_NAMES: { resend: 'Resend', twilio: 'Twilio', mailchimp: 'Mailchimp' },
}));

describe('ProviderInfoCard', () => {
  it('renders Sending via heading and provider display name', () => {
    render(<ProviderInfoCard providerType="resend" capabilities={{ email: true, sms: false }} />);
    expect(screen.getByText('Sending via')).toBeInTheDocument();
    expect(screen.getByText('Resend')).toBeInTheDocument();
  });

  it('falls back to providerType when display name is unknown', () => {
    render(<ProviderInfoCard providerType="unknown_provider" capabilities={{}} />);
    expect(screen.getByText('unknown_provider')).toBeInTheDocument();
  });

  it('renders status badge when status is provided', () => {
    render(
      <ProviderInfoCard
        providerType="twilio"
        status="connected"
        capabilities={{ sms: true }}
      />
    );
    expect(screen.getByTestId('status-badge')).toHaveTextContent('connected');
  });

  it('renders capability badges', () => {
    render(<ProviderInfoCard providerType="mailchimp" capabilities={{ email: true, sms: true }} />);
    expect(screen.getByTestId('capability-badges')).toHaveTextContent('{"email":true,"sms":true}');
  });

  it('renders warning when provided', () => {
    render(
      <ProviderInfoCard
        providerType="resend"
        capabilities={{ email: true }}
        warning="Verify your sender domain."
      />
    );
    expect(screen.getByText('Verify your sender domain.')).toBeInTheDocument();
  });
});
