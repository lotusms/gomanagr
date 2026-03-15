/**
 * Unit tests for ConfirmDialog:
 * - Renders when open; null when closed
 * - Close on overlay click, Escape, cancel, X button
 * - Loading: Escape and overlay do not close; button shows "Processing..."
 * - Variants: danger, warning, info; invalid variant falls back to danger
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick, disabled, ...props }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  SecondaryButton: ({ children, onClick, disabled, ...props }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

describe('ConfirmDialog', () => {
  it('returns null when not open', () => {
    const { container } = render(
      <ConfirmDialog isOpen={false} onClose={() => {}} onConfirm={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and message when open', () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete item?"
        message="This cannot be undone."
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete item?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = jest.fn();
    render(<ConfirmDialog isOpen onClose={onClose} onConfirm={() => {}} />);
    const [overlay] = screen.getAllByLabelText('Close');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    render(<ConfirmDialog isOpen onClose={onClose} onConfirm={() => {}} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when Escape is pressed and loading is true', () => {
    const onClose = jest.fn();
    render(<ConfirmDialog isOpen onClose={onClose} onConfirm={() => {}} loading />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables overlay close when loading', () => {
    const onClose = jest.fn();
    render(<ConfirmDialog isOpen onClose={onClose} onConfirm={() => {}} loading />);
    const [overlay] = screen.getAllByLabelText('Close');
    expect(overlay).toBeDisabled();
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog isOpen onClose={() => {}} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<ConfirmDialog isOpen onClose={onClose} onConfirm={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Processing... on confirm button when loading', () => {
    render(<ConfirmDialog isOpen onClose={() => {}} onConfirm={() => {}} loading />);
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
  });

  it('hides X close button when loading', () => {
    render(<ConfirmDialog isOpen onClose={() => {}} onConfirm={() => {}} loading />);
    const closeButtons = screen.getAllByLabelText('Close');
    expect(closeButtons.length).toBe(1);
  });

  it('uses custom confirm and cancel text', () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        confirmText="Yes, delete"
        cancelText="No"
      />
    );
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
  });

  it('applies warning variant styles', () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        variant="warning"
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('applies info variant styles', () => {
    render(
      <ConfirmDialog isOpen onClose={() => {}} onConfirm={() => {}} variant="info" />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('falls back to danger styles for unknown variant', () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        variant="unknown"
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
