/**
 * Unit tests for ResponsiveSectionWrapper
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResponsiveSectionWrapper from '@/components/dashboard/ResponsiveSectionWrapper';

describe('ResponsiveSectionWrapper', () => {
  const sections = [
    { value: 'basic', label: 'Basic', content: <div>Basic content</div> },
    { value: 'advanced', label: 'Advanced', content: <div>Advanced content</div> },
  ];

  it('renders section labels in accordion view (mobile)', () => {
    render(<ResponsiveSectionWrapper sections={sections} />);
    expect(screen.getAllByText('Basic').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Advanced').length).toBeGreaterThanOrEqual(1);
  });

  it('renders default open section content', () => {
    render(<ResponsiveSectionWrapper sections={sections} defaultTab="basic" />);
    expect(screen.getAllByText('Basic content').length).toBeGreaterThanOrEqual(1);
  });

  it('uses defaultTab when provided', () => {
    render(<ResponsiveSectionWrapper sections={sections} defaultTab="advanced" />);
    expect(screen.getAllByText('Advanced content').length).toBeGreaterThanOrEqual(1);
  });

  it('renders with empty sections', () => {
    const { container } = render(<ResponsiveSectionWrapper sections={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
