/**
 * Unit tests for UnsavedChangesPaginationDialog: render when open/closed, labels by direction,
 * Save and go, Discard and go, Cancel callbacks
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UnsavedChangesPaginationDialog from '@/components/ui/UnsavedChangesPaginationDialog';

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick, ...props }) => (
    <button type="button" onClick={onClick} {...props}>{children}</button>
  ),
  SecondaryButton: ({ children, onClick, ...props }) => (
    <button type="button" onClick={onClick} {...props}>{children}</button>
  ),
}));

describe('UnsavedChangesPaginationDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSaveAndGo: jest.fn(),
    onDiscardAndGo: jest.fn(),
    direction: 'next',
    itemNameSingular: 'contract',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<UnsavedChangesPaginationDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('renders title and message when open', () => {
    render(<UnsavedChangesPaginationDialog {...defaultProps} />);
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByText(/You have unsaved changes/)).toBeInTheDocument();
    expect(screen.getByText(/next contract without saving/)).toBeInTheDocument();
  });

  it('shows next labels when direction is next', () => {
    render(<UnsavedChangesPaginationDialog {...defaultProps} direction="next" itemNameSingular="invoice" />);
    expect(screen.getByRole('button', { name: /Save and go to next invoice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Discard and go to next/i })).toBeInTheDocument();
  });

  it('shows previous labels when direction is previous', () => {
    render(<UnsavedChangesPaginationDialog {...defaultProps} direction="previous" itemNameSingular="proposal" />);
    expect(screen.getByRole('button', { name: /Save and go to previous proposal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Discard and go to previous/i })).toBeInTheDocument();
  });

  it('calls onClose and onSaveAndGo when Save and go is clicked', () => {
    render(<UnsavedChangesPaginationDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Save and go to next contract/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSaveAndGo).toHaveBeenCalledTimes(1);
  });

  it('calls onClose and onDiscardAndGo when Discard and go is clicked', () => {
    render(<UnsavedChangesPaginationDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Discard and go to next/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDiscardAndGo).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<UnsavedChangesPaginationDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSaveAndGo).not.toHaveBeenCalled();
    expect(defaultProps.onDiscardAndGo).not.toHaveBeenCalled();
  });

  it('uses default itemNameSingular when not provided', () => {
    render(
      <UnsavedChangesPaginationDialog
        isOpen={true}
        onClose={jest.fn()}
        onSaveAndGo={jest.fn()}
        onDiscardAndGo={jest.fn()}
        direction="next"
      />
    );
    expect(screen.getByRole('button', { name: /Save and go to next item/i })).toBeInTheDocument();
  });
});
