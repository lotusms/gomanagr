/**
 * Unit tests for SecuritySettings: render heading and content
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import SecuritySettings from '@/components/settings/SecuritySettings';

describe('SecuritySettings', () => {
  it('renders Security heading and coming soon message', () => {
    render(<SecuritySettings />);
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByText(/password, two-factor/)).toBeInTheDocument();
    expect(screen.getByText(/Security settings coming soon/)).toBeInTheDocument();
  });
});
