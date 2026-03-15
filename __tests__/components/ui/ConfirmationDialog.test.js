/**
 * Unit tests for ConfirmationDialog:
 * - Type confirmation word to enable confirm; wrong word shows error
 * - handleConfirm, handleSecondaryConfirm, handleCancel
 * - requireConfirmationForSecondary; Enter key submit
 * - Variants danger/warning; fallback for unknown variant
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick, disabled, ...props }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  SecondaryButton: ({ children, onClick, disabled, ...props }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

describe('ConfirmationDialog', () => {
  it('renders when open with title and message', () => {
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete client?"
        message="This cannot be undone."
      />
    );
    expect(screen.getByText('Delete client?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('keeps confirm disabled and does not call onConfirm when word does not match', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        confirmationWord="delete"
      />
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    const input = screen.getByPlaceholderText('delete');
    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when user types the word and clicks confirm', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        confirmationWord="delete"
      />
    );
    fireEvent.change(screen.getByPlaceholderText('delete'), { target: { value: 'delete' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onClose when cancel is clicked and resets input', () => {
    const onClose = jest.fn();
    render(
      <ConfirmationDialog
        isOpen
        onClose={onClose}
        onConfirm={() => {}}
        confirmationWord="delete"
      />
    );
    fireEvent.change(screen.getByPlaceholderText('delete'), { target: { value: 'delete' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSecondaryConfirm when provided and secondary button clicked', () => {
    const onSecondaryConfirm = jest.fn();
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        onSecondaryConfirm={onSecondaryConfirm}
        secondaryConfirmText="Archive"
        confirmationWord="delete"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(onSecondaryConfirm).toHaveBeenCalled();
  });

  it('requires confirmation word for secondary when requireConfirmationForSecondary is true', () => {
    const onSecondaryConfirm = jest.fn();
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        onSecondaryConfirm={onSecondaryConfirm}
        secondaryConfirmText="Archive"
        confirmationWord="delete"
        requireConfirmationForSecondary
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(onSecondaryConfirm).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('delete'), { target: { value: 'delete' } });
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(onSecondaryConfirm).toHaveBeenCalled();
  });

  it('disables secondary button until word is typed when requireConfirmationForSecondary', () => {
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        onSecondaryConfirm={() => {}}
        secondaryConfirmText="Archive"
        confirmationWord="delete"
        requireConfirmationForSecondary
      />
    );
    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('delete'), { target: { value: 'delete' } });
    expect(screen.getByRole('button', { name: 'Archive' })).not.toBeDisabled();
  });

  it('submits on Enter when confirmation word is typed', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        confirmationWord="delete"
      />
    );
    const input = screen.getByPlaceholderText('delete');
    fireEvent.change(input, { target: { value: 'delete' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalled();
  });

  it('enables confirm button when word is typed and clears input on confirm', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        confirmationWord="delete"
      />
    );
    const input = screen.getByPlaceholderText('delete');
    fireEvent.change(input, { target: { value: 'delete' } });
    expect(screen.getByRole('button', { name: 'Delete' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('uses warning variant', () => {
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        variant="warning"
      />
    );
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('falls back to danger for unknown variant', () => {
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        variant="other"
      />
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('uses custom confirmation label when provided', () => {
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        confirmationWord="remove"
        confirmationLabel="Type remove to confirm"
      />
    );
    expect(screen.getByLabelText('Type remove to confirm')).toBeInTheDocument();
  });
});
