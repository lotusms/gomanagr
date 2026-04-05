/**
 * Unit tests for ActivityMatrixCard — single-column width, heatmap content.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ActivityMatrixCard from '@/components/insights/charts/ActivityMatrixCard';

jest.mock('@/components/insights/charts/MatrixHeat', () => {
  return function MockMatrixHeat() {
    return <div data-testid="matrix-heat">MatrixHeat</div>;
  };
});

describe('ActivityMatrixCard', () => {
  it('renders title and does not use full-width col-span by default', () => {
    const { container } = render(
      <ActivityMatrixCard
        rows={['Mon']}
        cols={['W1']}
        data={[[1]]}
        title="Invoices Activity"
        subtitle="Counts"
      />
    );
    expect(screen.getByText('Invoices Activity')).toBeInTheDocument();
    expect(screen.getByText('Counts')).toBeInTheDocument();
    const card = container.querySelector('[class*="rounded"]');
    expect(card).toBeTruthy();
    expect(screen.getByTestId('matrix-heat')).toBeInTheDocument();
  });
});
