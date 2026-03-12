/**
 * Unit tests for InvoicesPageSkeleton
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import InvoicesPageSkeleton from '@/components/dashboard/InvoicesPageSkeleton';

describe('InvoicesPageSkeleton', () => {
  it('renders with data-testid invoices-page-skeleton', () => {
    render(<InvoicesPageSkeleton />);
    expect(screen.getByTestId('invoices-page-skeleton')).toBeInTheDocument();
  });

  it('renders 6 card placeholders in the grid', () => {
    render(<InvoicesPageSkeleton />);
    const container = screen.getByTestId('invoices-page-skeleton');
    const cards = container.querySelectorAll('.rounded-xl.border');
    expect(cards.length).toBe(6);
  });
});
