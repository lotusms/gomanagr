/**
 * Unit tests for ProjectsPageSkeleton
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ProjectsPageSkeleton from '@/components/dashboard/ProjectsPageSkeleton';

describe('ProjectsPageSkeleton', () => {
  it('renders with data-testid projects-page-skeleton', () => {
    render(<ProjectsPageSkeleton />);
    expect(screen.getByTestId('projects-page-skeleton')).toBeInTheDocument();
  });

  it('renders 6 card placeholders in the grid', () => {
    render(<ProjectsPageSkeleton />);
    const container = screen.getByTestId('projects-page-skeleton');
    const cards = container.querySelectorAll('.rounded-xl.border');
    expect(cards.length).toBe(6);
  });
});
