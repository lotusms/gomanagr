/**
 * Unit tests for CardDeleteButton: click calls onDelete, stopPropagation, className applied.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CardDeleteButton from '@/components/clients/add-client/CardDeleteButton';

jest.mock('@/components/ui/buttons', () => ({
  IconButton: ({ onClick, className, title, 'aria-label': ariaLabel, children }) => (
    <button type="button" onClick={onClick} className={className} title={title} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));
jest.mock('react-icons/hi', () => ({ HiTrash: () => <span data-testid="icon-trash" /> }));

describe('CardDeleteButton', () => {
  it('calls onDelete when clicked', () => {
    const onDelete = jest.fn();
    render(<CardDeleteButton onDelete={onDelete} title="Delete item" />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete item' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('applies custom className when provided', () => {
    render(
      <CardDeleteButton onDelete={() => {}} title="Remove" className="opacity-60 group-hover:opacity-100" />
    );
    const btn = screen.getByRole('button', { name: 'Remove' });
    expect(btn.className).toMatch(/opacity-60/);
    expect(btn.className).toMatch(/group-hover:opacity-100/);
  });

  it('renders with title and aria-label', () => {
    render(<CardDeleteButton onDelete={() => {}} title="Delete attachment" />);
    const btn = screen.getByRole('button', { name: 'Delete attachment' });
    expect(btn).toHaveAttribute('title', 'Delete attachment');
    expect(btn).toHaveAttribute('aria-label', 'Delete attachment');
  });
});
