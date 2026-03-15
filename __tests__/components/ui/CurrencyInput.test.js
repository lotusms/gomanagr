/**
 * Unit tests for CurrencyInput:
 * - Renders value formatted; onChange receives unformatted value
 * - handleFocus: selectOnFocus, inputProps.onFocus
 * - handleBlur: formats display, inputProps.onBlur
 * - getCurrencySymbol: known codes and fallback for unknown
 * - label, required, error, sublabel
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CurrencyInput from '@/components/ui/CurrencyInput';

describe('CurrencyInput', () => {
  it('renders with label and formatted value', () => {
    render(
      <CurrencyInput
        id="price"
        label="Price"
        value="1234.56"
        onChange={() => {}}
      />
    );
    expect(screen.getByLabelText('Price')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1,234.56')).toBeInTheDocument();
  });

  it('calls onChange with unformatted value on change', () => {
    const onChange = jest.fn();
    render(
      <CurrencyInput
        id="price"
        label="Price"
        value=""
        onChange={onChange}
      />
    );
    const input = screen.getByLabelText('Price');
    fireEvent.change(input, { target: { value: '1,234.56' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '1234.56' }),
      })
    );
  });

  it('formats value on blur from current value prop', () => {
    render(
      <CurrencyInput
        id="price"
        label="Price"
        value="50"
        onChange={() => {}}
      />
    );
    const input = screen.getByLabelText('Price');
    expect(screen.getByDisplayValue('50.00')).toBeInTheDocument();
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input.value).toBe('50.00');
  });

  it('calls inputProps.onFocus when provided', () => {
    const onFocus = jest.fn();
    render(
      <CurrencyInput
        id="price"
        label="Price"
        value="0"
        onChange={() => {}}
        inputProps={{ onFocus }}
      />
    );
    fireEvent.focus(screen.getByLabelText('Price'));
    expect(onFocus).toHaveBeenCalled();
  });

  it('calls inputProps.onBlur when provided', () => {
    const onBlur = jest.fn();
    render(
      <CurrencyInput
        id="price"
        label="Price"
        value="10"
        onChange={() => {}}
        inputProps={{ onBlur }}
      />
    );
    const input = screen.getByLabelText('Price');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalled();
  });

  it('selectOnFocus does not throw on focus', () => {
    render(
      <CurrencyInput
        id="price"
        label="Price"
        value="1234.56"
        onChange={() => {}}
        selectOnFocus
      />
    );
    const input = screen.getByLabelText('Price');
    expect(() => fireEvent.focus(input)).not.toThrow();
  });

  it('shows currency symbol for USD', () => {
    render(
      <CurrencyInput id="price" label="Price" value="" onChange={() => {}} currency="USD" />
    );
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('shows currency symbol for EUR and GBP', () => {
    const { rerender } = render(
      <CurrencyInput id="price" label="Price" value="" onChange={() => {}} currency="EUR" />
    );
    expect(screen.getByText('€')).toBeInTheDocument();
    rerender(
      <CurrencyInput id="price" label="Price" value="" onChange={() => {}} currency="GBP" />
    );
    expect(screen.getByText('£')).toBeInTheDocument();
  });

  it('uses currency code as symbol for unknown currency', () => {
    render(
      <CurrencyInput id="price" label="Price" value="" onChange={() => {}} currency="XYZ" />
    );
    expect(screen.getByText('XYZ')).toBeInTheDocument();
  });

  it('renders required asterisk and error', () => {
    render(
      <CurrencyInput
        id="price"
        label="Price"
        value=""
        onChange={() => {}}
        required
        error="Required field"
      />
    );
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Required field');
  });

  it('shows sublabel when value is empty', () => {
    render(
      <CurrencyInput
        id="price"
        label="Price"
        value=""
        onChange={() => {}}
        sublabel="Optional for draft"
      />
    );
    expect(screen.getByText('Optional for draft')).toBeInTheDocument();
  });

  it('does not show sublabel when value is set', () => {
    render(
      <CurrencyInput
        id="price"
        label="Price"
        value="10"
        onChange={() => {}}
        sublabel="Optional for draft"
      />
    );
    expect(screen.queryByText('Optional for draft')).not.toBeInTheDocument();
  });

  it('does not call onChange when onChange is not provided', () => {
    render(
      <CurrencyInput id="price" label="Price" value="" currency="USD" />
    );
    const input = screen.getByLabelText('Price');
    expect(() => fireEvent.change(input, { target: { value: '99' } })).not.toThrow();
  });
});
