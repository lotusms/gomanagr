/**
 * Unit tests for PhoneNumberInput:
 * - Renders with default placeholder and forwards ref/rest to InputField
 * - Formats input and calls onChange with formatted value
 * - Does not throw when onChange is undefined (optional chaining branch)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PhoneNumberInput from '@/components/ui/PhoneNumberInput';

describe('PhoneNumberInput', () => {
  it('renders with default placeholder and passes value through', () => {
    render(
      <PhoneNumberInput
        id="phone"
        label="Phone"
        value="(717) 123-4567"
        onChange={() => {}}
      />
    );
    expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(717) 123-4567')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(717) 123-4567')).toBeInTheDocument();
  });

  it('calls onChange with formatted value when user types', () => {
    const onChange = jest.fn();
    render(
      <PhoneNumberInput
        id="phone"
        label="Phone"
        value=""
        onChange={onChange}
      />
    );
    const input = screen.getByLabelText('Phone');
    fireEvent.change(input, { target: { value: '7171234567' } });
    expect(onChange).toHaveBeenCalledWith('(717) 123-4567');
  });

  it('does not throw when onChange is undefined (optional chaining)', () => {
    render(
      <PhoneNumberInput
        id="phone"
        label="Phone"
        value=""
      />
    );
    const input = screen.getByLabelText('Phone');
    expect(() => {
      fireEvent.change(input, { target: { value: '717' } });
    }).not.toThrow();
  });

  it('uses custom placeholder when provided', () => {
    render(
      <PhoneNumberInput
        id="phone"
        label="Phone"
        value=""
        onChange={() => {}}
        placeholder="Enter phone"
      />
    );
    expect(screen.getByPlaceholderText('Enter phone')).toBeInTheDocument();
  });
});
