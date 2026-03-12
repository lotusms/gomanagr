/**
 * Unit tests for ContractsPageSkeleton
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ContractsPageSkeleton from '@/components/dashboard/ContractsPageSkeleton';

describe('ContractsPageSkeleton', () => {
  it('renders with data-testid contracts-page-skeleton', () => {
    render(<ContractsPageSkeleton />);
    expect(screen.getByTestId('contracts-page-skeleton')).toBeInTheDocument();
  });

  it('renders 6 card placeholders in the grid', () => {
    const { container } = render(<ContractsPageSkeleton />);
    const cards = container.querySelectorAll('.rounded-xl.border');
    expect(cards.length).toBe(6);
  });
});
