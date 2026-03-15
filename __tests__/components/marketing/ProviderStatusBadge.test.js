/**
 * Unit tests for ProviderStatusBadge: status labels and styling.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ProviderStatusBadge from '@/components/marketing/ProviderStatusBadge';

describe('ProviderStatusBadge', () => {
  it('renders Connected for connected status', () => {
    render(<ProviderStatusBadge status="connected" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders Not connected for not_connected status', () => {
    render(<ProviderStatusBadge status="not_connected" />);
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('renders Misconfigured for misconfigured status', () => {
    render(<ProviderStatusBadge status="misconfigured" />);
    expect(screen.getByText('Misconfigured')).toBeInTheDocument();
  });

  it('renders Not connected for unknown or missing status', () => {
    render(<ProviderStatusBadge status="unknown" />);
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    const { container } = render(<ProviderStatusBadge />);
    expect(container.textContent).toBe('Not connected');
  });

  it('is case insensitive', () => {
    render(<ProviderStatusBadge status="CONNECTED" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
});
