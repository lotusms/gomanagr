/**
 * Unit tests for ChipsArrayBuilder: add (button + Enter), remove, validateItem, duplicate, disabled
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChipsArrayBuilder from '@/components/ui/ChipsArrayBuilder';

jest.mock('@radix-ui/react-label', () => ({
  Root: ({ children, htmlFor, className }) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

jest.mock('@/components/ui/formControlStyles', () => ({
  FORM_CONTROL_LIGHT_LABEL: 'form-label',
  FORM_CONTROL_HEIGHT: 'h-9',
  FORM_CONTROL_BASE: 'base',
  FORM_CONTROL_FOCUS: 'focus',
  FORM_CONTROL_LIGHT_DEFAULT: 'light',
}));

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-testid="add-btn">
      {children}
    </button>
  ),
}));

jest.mock('react-icons/hi', () => ({
  HiPlus: () => <span data-testid="hi-plus">+</span>,
  HiX: () => <span data-testid="hi-x">×</span>,
}));

describe('ChipsArrayBuilder', () => {
  it('renders input and Add button with default placeholder', () => {
    render(
      <ChipsArrayBuilder id="chips" value={[]} onChange={jest.fn()} />
    );
    expect(screen.getByPlaceholderText('Type and add...')).toBeInTheDocument();
    expect(screen.getByTestId('add-btn')).toHaveTextContent('Add');
  });

  it('uses default value [] when value prop is omitted', async () => {
    const onChange = jest.fn();
    render(<ChipsArrayBuilder id="chips" onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'first');
    await userEvent.click(screen.getByTestId('add-btn'));
    expect(onChange).toHaveBeenCalledWith(['first']);
  });

  it('Enter with empty input does not call onChange', async () => {
    const onChange = jest.fn();
    render(<ChipsArrayBuilder id="chips" value={[]} onChange={onChange} />);
    screen.getByRole('textbox').focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders label when provided', () => {
    render(
      <ChipsArrayBuilder id="chips" label="Tags" value={[]} onChange={jest.fn()} />
    );
    expect(screen.getByLabelText('Tags')).toBeInTheDocument();
  });

  it('renders custom placeholder and addButtonLabel', () => {
    render(
      <ChipsArrayBuilder
        id="chips"
        value={[]}
        onChange={jest.fn()}
        placeholder="Add email..."
        addButtonLabel="Add Email"
      />
    );
    expect(screen.getByPlaceholderText('Add email...')).toBeInTheDocument();
    expect(screen.getByTestId('add-btn')).toHaveTextContent('Add Email');
  });

  it('calls onChange with new array when user types and clicks Add', async () => {
    const onChange = jest.fn();
    render(
      <ChipsArrayBuilder id="chips" value={[]} onChange={onChange} />
    );
    await userEvent.type(screen.getByRole('textbox'), 'foo');
    await userEvent.click(screen.getByTestId('add-btn'));
    expect(onChange).toHaveBeenCalledWith(['foo']);
  });

  it('appends to existing value when adding', async () => {
    const onChange = jest.fn();
    render(
      <ChipsArrayBuilder id="chips" value={['a']} onChange={onChange} />
    );
    await userEvent.type(screen.getByRole('textbox'), 'b');
    await userEvent.click(screen.getByTestId('add-btn'));
    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
  });

  it('trims input before adding', async () => {
    const onChange = jest.fn();
    render(
      <ChipsArrayBuilder id="chips" value={[]} onChange={onChange} />
    );
    await userEvent.type(screen.getByRole('textbox'), '  bar  ');
    await userEvent.click(screen.getByTestId('add-btn'));
    expect(onChange).toHaveBeenCalledWith(['bar']);
  });

  it('does not add duplicate item and clears input', async () => {
    const onChange = jest.fn();
    render(
      <ChipsArrayBuilder id="chips" value={['existing']} onChange={onChange} />
    );
    await userEvent.type(screen.getByRole('textbox'), 'existing');
    await userEvent.click(screen.getByTestId('add-btn'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('does not add when input is empty', async () => {
    const onChange = jest.fn();
    render(
      <ChipsArrayBuilder id="chips" value={[]} onChange={onChange} />
    );
    expect(screen.getByTestId('add-btn')).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox'), 'x');
    expect(screen.getByTestId('add-btn')).not.toBeDisabled();
    await userEvent.clear(screen.getByRole('textbox'));
    expect(screen.getByTestId('add-btn')).toBeDisabled();
  });

  it('Add on Enter key', async () => {
    const onChange = jest.fn();
    render(
      <ChipsArrayBuilder id="chips" value={[]} onChange={onChange} />
    );
    await userEvent.type(screen.getByRole('textbox'), 'enter-me{Enter}');
    expect(onChange).toHaveBeenCalledWith(['enter-me']);
  });

  it('calls onInvalidItem when validateItem returns false', async () => {
    const onChange = jest.fn();
    const onInvalidItem = jest.fn();
    const validateItem = (item) => item.includes('@');
    render(
      <ChipsArrayBuilder
        id="chips"
        value={[]}
        onChange={onChange}
        validateItem={validateItem}
        onInvalidItem={onInvalidItem}
      />
    );
    await userEvent.type(screen.getByRole('textbox'), 'not-an-email');
    await userEvent.click(screen.getByTestId('add-btn'));
    expect(onInvalidItem).toHaveBeenCalledWith('not-an-email');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds item when validateItem returns true', async () => {
    const onChange = jest.fn();
    const validateItem = (item) => item.includes('@');
    render(
      <ChipsArrayBuilder
        id="chips"
        value={[]}
        onChange={onChange}
        validateItem={validateItem}
      />
    );
    await userEvent.type(screen.getByRole('textbox'), 'a@b.com');
    await userEvent.click(screen.getByTestId('add-btn'));
    expect(onChange).toHaveBeenCalledWith(['a@b.com']);
  });

  it('renders chips and remove calls onChange with filtered array', async () => {
    const onChange = jest.fn();
    render(
      <ChipsArrayBuilder id="chips" value={['one', 'two', 'three']} onChange={onChange} />
    );
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    expect(screen.getByText('three')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove two' }));
    expect(onChange).toHaveBeenCalledWith(['one', 'three']);
  });

  it('does not render chips section when value is empty', () => {
    render(
      <ChipsArrayBuilder id="chips" value={[]} onChange={jest.fn()} />
    );
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
  });

  it('disables input, Add button, and remove buttons when disabled', () => {
    render(
      <ChipsArrayBuilder id="chips" value={['item']} onChange={jest.fn()} disabled />
    );
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByTestId('add-btn')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove item' })).toBeDisabled();
  });

  it('does not add when disabled even with input', async () => {
    const onChange = jest.fn();
    render(
      <ChipsArrayBuilder id="chips" value={[]} onChange={onChange} disabled />
    );
    await userEvent.type(screen.getByRole('textbox'), 'x');
    await userEvent.click(screen.getByTestId('add-btn'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
