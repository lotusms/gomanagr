/**
 * Unit tests for Toggle: render, value change, label, required, error, variant, disabled
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toggle from '@/components/ui/Toggle';

jest.mock('@radix-ui/react-toggle-group', () => ({
  Root: ({ children, value, onValueChange, disabled, id, className, 'aria-label': ariaLabel }) => (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      className={className}
      data-value={value}
      data-disabled={disabled}
    >
      {React.Children.map(children, (child) =>
        React.cloneElement(child, {
          onValueChange,
          currentValue: value,
        })
      )}
    </div>
  ),
  Item: ({ value, children, onValueChange, currentValue, disabled, className, 'aria-label': ariaLabel }) => (
    <button
      type="button"
      role="tab"
      aria-label={ariaLabel}
      aria-pressed={currentValue === value}
      disabled={disabled}
      className={className}
      data-value={value}
      onClick={() => {
        if (!disabled && onValueChange) {
          const next = currentValue === value ? '' : value;
          onValueChange(next);
        }
      }}
    >
      {children}
    </button>
  ),
}));

jest.mock('@radix-ui/react-label', () => ({
  Root: ({ children, htmlFor, className }) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

const mockGetLabelClasses = jest.fn((v) => `label-${v}`);
jest.mock('@/components/ui/formControlStyles', () => ({
  getLabelClasses: (...args) => mockGetLabelClasses(...args),
}));

describe('Toggle', () => {
  const defaultProps = {
    id: 'view-toggle',
    label: 'View',
    value: 'cards',
    onValueChange: jest.fn(),
    option1: 'cards',
    option1Label: 'Cards',
    option2: 'table',
    option2Label: 'Table',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders label and both options', () => {
    render(<Toggle {...defaultProps} />);
    expect(screen.getByLabelText('View')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cards' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Table' })).toBeInTheDocument();
  });

  it('uses option1 as current value when value matches option1', () => {
    render(<Toggle {...defaultProps} value="cards" />);
    expect(screen.getByRole('tab', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: 'Table' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses option2 as current value when value matches option2', () => {
    render(<Toggle {...defaultProps} value="table" />);
    expect(screen.getByRole('tab', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('falls back to option1 when value is invalid or empty', () => {
    const { rerender } = render(<Toggle {...defaultProps} value="" />);
    expect(screen.getByRole('tab', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'true');
    rerender(<Toggle {...defaultProps} value="other" />);
    expect(screen.getByRole('tab', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onValueChange with option2 when clicking option2', async () => {
    const onValueChange = jest.fn();
    render(<Toggle {...defaultProps} value="cards" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Table' }));
    expect(onValueChange).toHaveBeenCalledWith('table');
  });

  it('calls onValueChange with option1 when Radix sends empty (deselect) via handleValueChange', async () => {
    const onValueChange = jest.fn();
    render(<Toggle {...defaultProps} value="table" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Table' }));
    expect(onValueChange).toHaveBeenCalledWith('cards');
  });

  it('shows required asterisk with light variant', () => {
    render(<Toggle {...defaultProps} required />);
    expect(screen.getByText('*')).toHaveClass('text-red-500');
  });

  it('shows required asterisk with dark variant', () => {
    render(<Toggle {...defaultProps} required variant="dark" />);
    expect(screen.getByText('*')).toHaveClass('text-red-400');
  });

  it('shows error message with light variant', () => {
    render(<Toggle {...defaultProps} error="Pick one" />);
    expect(screen.getByText('Pick one')).toHaveClass('text-red-600');
  });

  it('shows error message with dark variant', () => {
    render(<Toggle {...defaultProps} error="Pick one" variant="dark" />);
    expect(screen.getByText('Pick one')).toHaveClass('text-red-300');
  });

  it('applies className to wrapper and passes disabled to root', () => {
    render(<Toggle {...defaultProps} className="my-toggle" disabled />);
    expect(document.querySelector('.my-toggle')).toBeInTheDocument();
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('data-disabled', 'true');
  });

  it('does not render label when label is falsy', () => {
    const { container } = render(<Toggle {...defaultProps} label={null} />);
    expect(container.querySelector('label')).not.toBeInTheDocument();
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Toggle option');
  });

  it('uses label for aria-label when provided', () => {
    render(<Toggle {...defaultProps} />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'View');
  });
});
