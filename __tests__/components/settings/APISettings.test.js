/**
 * Unit tests for APISettings: render heading and content
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import APISettings from '@/components/settings/APISettings';

describe('APISettings', () => {
  it('renders API heading and coming soon message', () => {
    render(<APISettings />);
    expect(screen.getByRole('heading', { name: 'API' })).toBeInTheDocument();
    expect(screen.getByText(/API keys and usage/)).toBeInTheDocument();
    expect(screen.getByText(/API settings coming soon/)).toBeInTheDocument();
  });
});
