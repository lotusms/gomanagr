/**
 * Unit tests for SidebarToggle: render, aria-label, onToggle
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SidebarToggle from '@/components/layouts/SidebarToggle';

describe('SidebarToggle', () => {
  it('renders a button with Expand sidebar label when not expanded', () => {
    render(<SidebarToggle expanded={false} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });

  it('renders a button with Collapse sidebar label when expanded', () => {
    render(<SidebarToggle expanded={true} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = jest.fn();
    render(<SidebarToggle expanded={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
