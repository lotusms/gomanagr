/**
 * Unit tests for ResponsiveSectionWrapper
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('toggles section closed when clicking the open section', async () => {
    const { container } = render(<ResponsiveSectionWrapper sections={sections} defaultTab="basic" />);
    const accordionEl = container.querySelector('.space-y-4');
    expect(accordionEl).toBeTruthy();
    expect(accordionEl.textContent).toContain('Basic content');
    const basicButtons = screen.getAllByRole('button', { name: 'Basic' });
    const accordionButton = basicButtons[0];
    fireEvent.click(accordionButton);
    await waitFor(() => expect(accordionEl.textContent).not.toContain('Basic content'));
    fireEvent.click(accordionButton);
    expect(accordionEl.textContent).toContain('Basic content');
  });

  it('uses sections[0].value when defaultTab not provided', () => {
    render(<ResponsiveSectionWrapper sections={sections} />);
    expect(screen.getAllByText('Basic content').length).toBeGreaterThanOrEqual(1);
  });
});
