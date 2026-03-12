/**
 * Unit tests for ClientFormPageSkeleton
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ClientFormPageSkeleton from '@/components/clients/ClientFormPageSkeleton';

describe('ClientFormPageSkeleton', () => {
  it('renders with data-testid client-form-page-skeleton', () => {
    render(<ClientFormPageSkeleton />);
    expect(screen.getByTestId('client-form-page-skeleton')).toBeInTheDocument();
  });

  it('renders 6 tab placeholders by default (Projects)', () => {
    render(<ClientFormPageSkeleton />);
    const container = screen.getByTestId('client-form-page-skeleton');
    const tabBar = container.querySelector('.flex.gap-1.px-4.border-b');
    expect(tabBar).toBeInTheDocument();
    const tabs = tabBar.querySelectorAll('.rounded-t');
    expect(tabs.length).toBe(6);
  });

  it('uses projectTermPlural when provided for tab labels', () => {
    render(<ClientFormPageSkeleton projectTermPlural="Cases" />);
    const container = screen.getByTestId('client-form-page-skeleton');
    expect(container).toBeInTheDocument();
    const tabBar = container.querySelector('.flex.gap-1.px-4.border-b');
    expect(tabBar.querySelectorAll('.rounded-t').length).toBe(6);
  });

  it('renders header, toggle, card, and action button placeholders', () => {
    render(<ClientFormPageSkeleton />);
    const container = screen.getByTestId('client-form-page-skeleton');
    expect(container).toHaveClass('space-y-6');
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(5);
  });
});
