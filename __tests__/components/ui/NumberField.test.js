/**
 * Unit tests for NumberField:
 * - Renders with value, label, placeholder, min, max, step
 * - Label optional; required asterisk (light vs dark variant)
 * - Error state: message, aria-invalid, aria-describedby
 * - variant dark without error applies white color style; light or with error does not
 * - inputClassName and inputProps forwarded
 * - Ref forwarded to input
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NumberField from '@/components/ui/NumberField';

describe('NumberField', () => {
  it('renders with value, label, placeholder, min, max, step', () => {
    render(
      <NumberField
        id="qty"
        label="Quantity"
        value={5}
        onChange={() => {}}
        placeholder="0"
        min={0}
        max={100}
        step={2}
      />
    );
    const input = screen.getByLabelText('Quantity');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(5);
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
    expect(input).toHaveAttribute('step', '2');
    expect(input).toHaveAttribute('placeholder', '0');
  });

  it('does not render label when label is null or empty', () => {
    const { rerender } = render(
      <NumberField id="qty" value={0} onChange={() => {}} />
    );
    expect(screen.queryByRole('label')).not.toBeInTheDocument();

    rerender(<NumberField id="qty" label="" value={0} onChange={() => {}} />);
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });

  it('renders required asterisk with light variant class', () => {
    render(
      <NumberField
        id="qty"
        label="Qty"
        required
        variant="light"
        value=""
        onChange={() => {}}
      />
    );
    expect(screen.getByText('*')).toHaveClass('text-red-500');
  });

  it('renders required asterisk with dark variant class', () => {
    render(
      <NumberField
        id="qty"
        label="Qty"
        required
        variant="dark"
        value=""
        onChange={() => {}}
      />
    );
    expect(screen.getByText('*')).toHaveClass('text-red-400');
  });

  it('shows error message and sets aria-invalid and aria-describedby', () => {
    render(
      <NumberField
        id="qty"
        label="Qty"
        value={0}
        onChange={() => {}}
        error="Must be positive"
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Must be positive');
    const input = screen.getByLabelText('Qty');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'qty-error');
  });

  it('applies dark variant white color style when no error', () => {
    render(
      <NumberField
        id="qty"
        label="Qty"
        value={1}
        onChange={() => {}}
        variant="dark"
      />
    );
    const input = screen.getByLabelText('Qty');
    expect(input).toHaveStyle({ color: 'white' });
  });

  it('does not apply white color style when variant is light', () => {
    render(
      <NumberField
        id="qty"
        label="Qty"
        value={1}
        onChange={() => {}}
        variant="light"
      />
    );
    const input = screen.getByLabelText('Qty');
    expect(input).not.toHaveStyle({ color: 'white' });
  });

  it('does not apply white color style when error is set (dark variant)', () => {
    render(
      <NumberField
        id="qty"
        label="Qty"
        value={1}
        onChange={() => {}}
        variant="dark"
        error="Invalid"
      />
    );
    const input = screen.getByLabelText('Qty');
    expect(input).not.toHaveStyle({ color: 'white' });
  });

  it('displays empty string when value is empty or null', () => {
    const { rerender } = render(
      <NumberField id="qty" label="Qty" value="" onChange={() => {}} />
    );
    expect(screen.getByLabelText('Qty')).toHaveValue(null);

    rerender(<NumberField id="qty" label="Qty" value={null} onChange={() => {}} />);
    expect(screen.getByLabelText('Qty')).toHaveValue(null);
  });

  it('forwards onChange when input changes', () => {
    const onChange = jest.fn();
    render(
      <NumberField id="qty" label="Qty" value={0} onChange={onChange} />
    );
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '10' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('forwards ref to input', () => {
    const ref = React.createRef();
    render(
      <NumberField id="qty" label="Qty" value={0} onChange={() => {}} ref={ref} />
    );
    expect(ref.current).toBe(screen.getByLabelText('Qty'));
  });

  it('applies inputClassName and forwards inputProps', () => {
    render(
      <NumberField
        id="qty"
        label="Qty"
        value={0}
        onChange={() => {}}
        inputClassName="text-right"
        inputProps={{ 'data-testid': 'number-input', autoComplete: 'off' }}
      />
    );
    const input = screen.getByTestId('number-input');
    expect(input).toHaveClass('text-right');
    expect(input).toHaveAttribute('autocomplete', 'off');
  });

  it('uses default step of 1 when step not provided', () => {
    render(
      <NumberField id="qty" label="Qty" value={0} onChange={() => {}} />
    );
    expect(screen.getByLabelText('Qty')).toHaveAttribute('step', '1');
  });

  it('renders disabled when disabled is true', () => {
    render(
      <NumberField id="qty" label="Qty" value={0} onChange={() => {}} disabled />
    );
    expect(screen.getByLabelText('Qty')).toBeDisabled();
  });
});
