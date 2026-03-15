/**
 * Unit tests for ProviderCapabilityBadges: email/sms badges and empty state.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ProviderCapabilityBadges from '@/components/marketing/ProviderCapabilityBadges';

describe('ProviderCapabilityBadges', () => {
  it('returns null when capabilities is null/undefined', () => {
    const { container } = render(<ProviderCapabilityBadges capabilities={null} />);
    expect(container.firstChild).toBeNull();
    const { container: c2 } = render(<ProviderCapabilityBadges />);
    expect(c2.firstChild).toBeNull();
  });

  it('shows Email badge when email is true', () => {
    render(<ProviderCapabilityBadges capabilities={{ email: true, sms: false }} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.queryByText('SMS')).not.toBeInTheDocument();
  });

  it('shows SMS badge when sms is true', () => {
    render(<ProviderCapabilityBadges capabilities={{ email: false, sms: true }} />);
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.queryByText('Email')).not.toBeInTheDocument();
  });

  it('shows both badges when both are true', () => {
    render(<ProviderCapabilityBadges capabilities={{ email: true, sms: true }} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
  });

  it('shows No capabilities when both are false', () => {
    render(<ProviderCapabilityBadges capabilities={{ email: false, sms: false }} />);
    expect(screen.getByText('No capabilities')).toBeInTheDocument();
  });
});
