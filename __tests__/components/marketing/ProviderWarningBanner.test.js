/**
 * Unit tests for ProviderWarningBanner: title, message, variant (warning/error).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ProviderWarningBanner from '@/components/marketing/ProviderWarningBanner';

jest.mock('react-icons/hi', () => ({ HiExclamation: () => <span data-testid="icon-exclamation" /> }));

describe('ProviderWarningBanner', () => {
  it('renders title and message', () => {
    render(<ProviderWarningBanner title="No provider" message="Configure a provider in Settings." />);
    expect(screen.getByText('No provider')).toBeInTheDocument();
    expect(screen.getByText('Configure a provider in Settings.')).toBeInTheDocument();
  });

  it('renders only title when message is omitted', () => {
    render(<ProviderWarningBanner title="Warning" />);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('renders only message when title is omitted', () => {
    render(<ProviderWarningBanner message="Something went wrong." />);
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<ProviderWarningBanner title="Test" />);
    expect(screen.getByTestId('icon-exclamation')).toBeInTheDocument();
  });

  it('uses warning variant by default', () => {
    const { container } = render(<ProviderWarningBanner title="Warning" message="Msg" />);
    expect(container.querySelector('.bg-amber-50, .border-amber-200')).toBeTruthy();
  });

  it('uses error variant when variant is error', () => {
    const { container } = render(<ProviderWarningBanner title="Error" message="Msg" variant="error" />);
    expect(container.querySelector('.bg-red-50, .border-red-200')).toBeTruthy();
  });
});
