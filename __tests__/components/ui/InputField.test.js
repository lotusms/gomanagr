/**
 * Unit tests for InputField: label, value, error, validation, and custom icon visibility.
 * Regression: custom icon (e.g. eye for secrets) must stay visible when value is revealed (type=text, valid).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import InputField from '@/components/ui/InputField';

jest.mock('@/components/ui/formControlStyles', () => ({
  getInputClasses: () => 'input-class',
  getLabelClasses: () => 'label-class',
}));

describe('InputField', () => {
  it('renders label, value, and placeholder', () => {
    render(
      <InputField
        id="email"
        label="Email"
        value="a@b.com"
        onChange={() => {}}
        placeholder="you@example.com"
      />
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByDisplayValue('a@b.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('shows error message and aria-invalid when error is set', () => {
    render(
      <InputField
        id="f"
        label="Field"
        value="x"
        error="Invalid value"
        onChange={() => {}}
      />
    );
    const input = screen.getByLabelText('Field');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid value');
  });

  it('shows custom icon when provided and no error (eye toggle for secrets)', () => {
    const EyeIcon = () => <span data-testid="eye-icon">👁</span>;
    const { rerender } = render(
      <InputField
        id="secret"
        label="Secret key"
        type="password"
        value="sk_test_123"
        onChange={() => {}}
        icon={<EyeIcon />}
      />
    );
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    // When value is revealed we use type="text" and value is present (valid) – icon must still show
    rerender(
      <InputField
        id="secret"
        label="Secret key"
        type="text"
        value="sk_test_123"
        onChange={() => {}}
        icon={<EyeIcon />}
      />
    );
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
  });

  it('hides custom icon when checking is true', () => {
    const EyeIcon = () => <span data-testid="eye-icon">👁</span>;
    render(
      <InputField
        id="secret"
        label="Secret"
        value="x"
        onChange={() => {}}
        icon={<EyeIcon />}
        checking
      />
    );
    expect(screen.queryByTestId('eye-icon')).not.toBeInTheDocument();
  });

  it('hides custom icon when has error', () => {
    const EyeIcon = () => <span data-testid="eye-icon">👁</span>;
    render(
      <InputField
        id="secret"
        label="Secret"
        value="x"
        error="Required"
        onChange={() => {}}
        icon={<EyeIcon />}
      />
    );
    expect(screen.queryByTestId('eye-icon')).not.toBeInTheDocument();
  });
});
