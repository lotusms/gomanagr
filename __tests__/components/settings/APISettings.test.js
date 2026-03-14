/**
 * Unit tests for APISettings: render heading and content
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import APISettings from '@/components/settings/APISettings';

describe('APISettings', () => {
  it('renders API heading and integrations description', () => {
    render(<APISettings />);
    expect(screen.getByRole('heading', { name: 'API' })).toBeInTheDocument();
    expect(screen.getByText(/API keys and integrations for payments, marketing, and other services/)).toBeInTheDocument();
  });
});
