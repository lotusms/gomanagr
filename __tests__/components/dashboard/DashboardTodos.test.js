/**
 * Unit tests for DashboardTodos:
 * - Renders null when items empty
 * - Renders heading and items; Link vs button vs div by href/onItemClick
 * - Dismiss button calls onDismiss with item.id
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardTodos from '@/components/dashboard/DashboardTodos';

jest.mock('next/link', () => {
  return function MockLink({ children, href, className }) {
    return <a href={href} className={className}>{children}</a>;
  };
});

jest.mock('react-icons/hi', () => ({
  HiX: () => <span data-testid="hi-x">×</span>,
}));

describe('DashboardTodos', () => {
  const mockOnDismiss = jest.fn();
  const mockOnItemClick = jest.fn();

  beforeEach(() => {
    mockOnDismiss.mockClear();
    mockOnItemClick.mockClear();
  });

  it('returns null when items is empty', () => {
    const { container } = render(<DashboardTodos items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when items is not passed (default)', () => {
    const { container } = render(<DashboardTodos />);
    expect(container.firstChild).toBeNull();
  });

  it('renders heading and item title/description', () => {
    const Icon = () => <span data-testid="icon">Icon</span>;
    render(
      <DashboardTodos
        items={[{ id: '1', Icon, title: 'Complete profile', description: 'Add your business details' }]}
      />
    );
    expect(screen.getByRole('heading', { name: 'To do' })).toBeInTheDocument();
    expect(screen.getByText('Complete profile')).toBeInTheDocument();
    expect(screen.getByText('Add your business details')).toBeInTheDocument();
  });

  it('renders as Link when item has href', () => {
    const Icon = () => <span>I</span>;
    render(
      <DashboardTodos
        items={[{ id: '1', Icon, title: 'Task', description: 'Desc', href: '/settings' }]}
      />
    );
    const link = screen.getByRole('link', { name: /Task/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/settings');
  });

  it('renders as button and calls onItemClick when no href and onItemClick provided', async () => {
    const Icon = () => <span>I</span>;
    const item = { id: '1', Icon, title: 'Task', description: 'Desc' };
    render(
      <DashboardTodos items={[item]} onItemClick={mockOnItemClick} />
    );
    const btn = screen.getByRole('button', { name: /Task/ });
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    expect(mockOnItemClick).toHaveBeenCalledWith(item);
  });

  it('renders as div when no href and no onItemClick', () => {
    const Icon = () => <span>I</span>;
    const { container } = render(
      <DashboardTodos items={[{ id: '1', Icon, title: 'Task', description: 'Desc' }]} />
    );
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(container.querySelector('a')).not.toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('aria-label', 'Dismiss');
  });

  it('calls onDismiss with item.id when Dismiss is clicked', async () => {
    const Icon = () => <span>I</span>;
    render(
      <DashboardTodos
        items={[{ id: 'todo-1', Icon, title: 'Task', description: 'Desc' }]}
        onDismiss={mockOnDismiss}
      />
    );
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
    await userEvent.click(dismissBtn);
    expect(mockOnDismiss).toHaveBeenCalledWith('todo-1');
  });

  it('does not throw when Dismiss clicked and onDismiss not provided', async () => {
    const Icon = () => <span>I</span>;
    render(
      <DashboardTodos items={[{ id: '1', Icon, title: 'Task', description: 'Desc' }]} />
    );
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
    await userEvent.click(dismissBtn);
    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it('renders multiple items', () => {
    const Icon = () => <span>I</span>;
    render(
      <DashboardTodos
        items={[
          { id: '1', Icon, title: 'First', description: 'D1' },
          { id: '2', Icon, title: 'Second', description: 'D2' },
        ]}
      />
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(2);
  });
});
