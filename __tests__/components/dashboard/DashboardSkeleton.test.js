/**
 * Unit tests for DashboardSkeleton
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';

describe('DashboardSkeleton', () => {
  it('renders with data-testid dashboard-skeleton', () => {
    render(<DashboardSkeleton />);
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
  });

  it('renders stats grid with 4 card placeholders', () => {
    const { container } = render(<DashboardSkeleton />);
    const statsGrid = container.querySelector('.grid.lg\\:grid-cols-4');
    expect(statsGrid).toBeInTheDocument();
    expect(statsGrid?.children.length).toBe(4);
  });

  it('renders action cards grid and todos section', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.querySelectorAll('.rounded-xl.border').length).toBeGreaterThanOrEqual(4);
  });
});
