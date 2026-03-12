/**
 * Unit tests for BillingSettings: render heading and content
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import BillingSettings from '@/components/settings/BillingSettings';

describe('BillingSettings', () => {
  it('renders Billing heading and coming soon message', () => {
    render(<BillingSettings />);
    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument();
    expect(screen.getByText(/Plans, payment methods/)).toBeInTheDocument();
    expect(screen.getByText(/Billing settings coming soon/)).toBeInTheDocument();
  });
});
