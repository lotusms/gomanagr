/**
 * Unit tests for LivePulse.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import LivePulse from '@/components/insights/charts/LivePulse';

describe('LivePulse', () => {
  it('renders Live label', () => {
    render(<LivePulse />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });
});
