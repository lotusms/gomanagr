/**
 * Unit tests for MatrixHeat grid rendering.
 */

import React from 'react';

jest.mock('framer-motion', () => {
  const motion = {
    div: ({ children, initial, animate, transition, whileInView, viewport, ...rest }) => (
      <div {...rest}>{children}</div>
    ),
  };
  return { motion };
});
import { render, screen } from '@testing-library/react';
import MatrixHeat from '@/components/insights/charts/MatrixHeat';

describe('MatrixHeat', () => {
  const rows = ['Mon', 'Tue'];
  const cols = ['W1', 'W2'];
  const data = [
    [1, 2],
    [3, 4],
  ];

  it('renders column headers and row labels', () => {
    render(<MatrixHeat rows={rows} cols={cols} data={data} />);
    expect(screen.getByText('W1')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
