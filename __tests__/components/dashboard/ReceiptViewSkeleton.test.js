/**
 * Unit tests for ReceiptViewSkeleton
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ReceiptViewSkeleton from '@/components/dashboard/ReceiptViewSkeleton';

describe('ReceiptViewSkeleton', () => {
  it('renders with data-testid receipt-view-skeleton', () => {
    render(<ReceiptViewSkeleton />);
    expect(screen.getByTestId('receipt-view-skeleton')).toBeInTheDocument();
  });
});
