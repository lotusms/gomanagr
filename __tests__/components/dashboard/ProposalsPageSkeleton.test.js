/**
 * Unit tests for ProposalsPageSkeleton
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ProposalsPageSkeleton from '@/components/dashboard/ProposalsPageSkeleton';

describe('ProposalsPageSkeleton', () => {
  it('renders with data-testid proposals-page-skeleton', () => {
    render(<ProposalsPageSkeleton />);
    expect(screen.getByTestId('proposals-page-skeleton')).toBeInTheDocument();
  });

  it('renders 6 card placeholders in the grid', () => {
    render(<ProposalsPageSkeleton />);
    const container = screen.getByTestId('proposals-page-skeleton');
    const cards = container.querySelectorAll('.rounded-xl.border');
    expect(cards.length).toBe(6);
  });
});
