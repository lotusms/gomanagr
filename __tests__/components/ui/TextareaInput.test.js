/**
 * Unit tests for TextareaInput: render, label, required, error, variant, disabled, onChange/onBlur
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TextareaInput from '@/components/ui/TextareaInput';

jest.mock('@radix-ui/react-label', () => ({
  Root: ({ children, htmlFor, className }) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

const mockGetLabelClasses = jest.fn((v) => `label-${v}`);
const mockGetTextareaClasses = jest.fn((v, hasError) => `textarea-${v}-${hasError}`);
jest.mock('@/components/ui/formControlStyles', () => ({
  getLabelClasses: (...args) => mockGetLabelClasses(...args),
  getTextareaClasses: (...args) => mockGetTextareaClasses(...args),
}));

describe('TextareaInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders textarea with id, label, value and onChange', () => {
    render(
      <TextareaInput
        id="desc"
        label="Description"
        value="Hello"
        onChange={jest.fn()}
      />
    );
    const textarea = screen.getByRole('textbox', { name: /Description/ });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('id', 'desc');
    expect(textarea).toHaveValue('Hello');
  });

  it('uses default rows and variant when not provided', () => {
    render(
      <TextareaInput id="d" label="L" value="" onChange={jest.fn()} />
    );
    const textarea = screen.getByRole('textbox', { name: /L/ });
    expect(textarea).toHaveAttribute('rows', '3');
    expect(mockGetTextareaClasses).toHaveBeenCalledWith('light', false);
    expect(mockGetLabelClasses).toHaveBeenCalledWith('light');
  });

  it('passes placeholder, rows, and className', () => {
    render(
      <TextareaInput
        id="d"
        label="L"
        value=""
        onChange={jest.fn()}
        placeholder="Enter text"
        rows={5}
        className="my-wrap"
      />
    );
    const textarea = screen.getByRole('textbox', { name: /L/ });
    expect(textarea).toHaveAttribute('placeholder', 'Enter text');
    expect(textarea).toHaveAttribute('rows', '5');
    expect(document.querySelector('.my-wrap')).toBeInTheDocument();
  });

  it('does not render label when label is null', () => {
    const { container } = render(
      <TextareaInput id="d" label={null} value="" onChange={jest.fn()} />
    );
    expect(container.querySelector('#d')).toBeInTheDocument();
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('does not render label when label is empty string', () => {
    const { container } = render(
      <TextareaInput id="d" label="" value="" onChange={jest.fn()} />
    );
    const textarea = container.querySelector('#d');
    expect(textarea).toBeInTheDocument();
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('shows required asterisk with light variant', () => {
    render(
      <TextareaInput id="d" label="Required" value="" onChange={jest.fn()} required />
    );
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveClass('text-red-500');
  });

  it('shows required asterisk with dark variant', () => {
    render(
      <TextareaInput id="d" label="Required" value="" onChange={jest.fn()} required variant="dark" />
    );
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveClass('text-red-400');
  });

  it('shows error message and sets aria-invalid and aria-describedby', () => {
    render(
      <TextareaInput
        id="desc"
        label="Description"
        value="x"
        onChange={jest.fn()}
        error="This field is required"
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'desc-error');
    const textarea = screen.getByRole('textbox', { name: /Description/ });
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAttribute('aria-describedby', 'desc-error');
    expect(mockGetTextareaClasses).toHaveBeenCalledWith('light', true);
  });

  it('uses light error text class when variant is light', () => {
    render(
      <TextareaInput id="d" label="L" value="" onChange={jest.fn()} error="Err" variant="light" />
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('text-red-600');
  });

  it('uses dark error text class when variant is dark', () => {
    render(
      <TextareaInput id="d" label="L" value="" onChange={jest.fn()} error="Err" variant="dark" />
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('text-red-300');
  });

  it('renders disabled textarea', () => {
    render(
      <TextareaInput id="d" label="L" value="" onChange={jest.fn()} disabled />
    );
    expect(screen.getByRole('textbox', { name: /L/ })).toBeDisabled();
  });

  it('calls onChange when value changes', () => {
    const onChange = jest.fn();
    render(
      <TextareaInput id="d" label="L" value="" onChange={onChange} />
    );
    fireEvent.change(screen.getByRole('textbox', { name: /L/ }), { target: { value: 'new' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('calls onBlur when textarea blurs', () => {
    const onBlur = jest.fn();
    render(
      <TextareaInput id="d" label="L" value="" onChange={jest.fn()} onBlur={onBlur} />
    );
    fireEvent.blur(screen.getByRole('textbox', { name: /L/ }));
    expect(onBlur).toHaveBeenCalled();
  });

  it('passes required to the textarea element', () => {
    render(
      <TextareaInput id="d" label="L" value="" onChange={jest.fn()} required />
    );
    expect(screen.getByRole('textbox', { name: /L/ })).toBeRequired();
  });
});
