/**
 * Unit tests for ReceiptsPageSkeleton
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ReceiptsPageSkeleton from '@/components/dashboard/ReceiptsPageSkeleton';

describe('ReceiptsPageSkeleton', () => {
  it('renders with data-testid receipts-page-skeleton', () => {
    render(<ReceiptsPageSkeleton />);
    expect(screen.getByTestId('receipts-page-skeleton')).toBeInTheDocument();
  });

  it('renders 6 card placeholders in the grid', () => {
    render(<ReceiptsPageSkeleton />);
    const container = screen.getByTestId('receipts-page-skeleton');
    const cards = container.querySelectorAll('.rounded-xl.border');
    expect(cards.length).toBe(6);
  });
});
