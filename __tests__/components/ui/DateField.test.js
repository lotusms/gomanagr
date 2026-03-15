/**
 * Unit tests for DateField:
 * - Renders with value (formatted); label, required, error
 * - Open/close calendar; click outside to close
 * - handleDateSelect (click day); navigateMonth prev/next
 * - handleInputBlur: parsed date and empty; handleInputFocus
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DateField from '@/components/ui/DateField';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => ({ dateFormat: 'MM/DD/YYYY', timezone: 'UTC' }),
}));

describe('DateField', () => {
  it('renders with label and formatted value', () => {
    render(
      <DateField
        id="start"
        label="Start date"
        value="2026-03-15"
        onChange={() => {}}
      />
    );
    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    expect(screen.getByDisplayValue('03/15/2026')).toBeInTheDocument();
  });

  it('opens calendar when calendar button is clicked', () => {
    render(
      <DateField id="start" label="Start" value="2026-03-15" onChange={() => {}} />
    );
    fireEvent.click(screen.getByLabelText('Open calendar'));
    expect(screen.getByText('March 2026')).toBeInTheDocument();
  });

  it('closes calendar when clicking outside', () => {
    render(
      <div>
        <DateField id="start" label="Start" value="2026-03-15" onChange={() => {}} />
        <button type="button">Outside</button>
      </div>
    );
    fireEvent.click(screen.getByLabelText('Open calendar'));
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByText('March 2026')).not.toBeInTheDocument();
  });

  it('calls onChange when a day is selected', () => {
    const onChange = jest.fn();
    render(
      <DateField id="start" label="Start" value="2026-03-15" onChange={onChange} />
    );
    fireEvent.click(screen.getByLabelText('Open calendar'));
    fireEvent.click(screen.getByRole('button', { name: '15' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '2026-03-15' }),
      })
    );
  });

  it('navigates to previous and next month', () => {
    render(
      <DateField id="start" label="Start" value="2026-03-15" onChange={() => {}} />
    );
    fireEvent.click(screen.getByLabelText('Open calendar'));
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Previous month'));
    expect(screen.getByText('February 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByText('March 2026')).toBeInTheDocument();
  });

  it('calls onChange on blur with parsed date', () => {
    const onChange = jest.fn();
    render(
      <DateField id="start" label="Start" value="" onChange={onChange} />
    );
    const input = screen.getByLabelText('Start');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '03/15/2026' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '2026-03-15' }),
      })
    );
  });

  it('calls onChange with empty value on blur when input is cleared', () => {
    const onChange = jest.fn();
    render(
      <DateField id="start" label="Start" value="2026-03-15" onChange={onChange} />
    );
    const input = screen.getByLabelText('Start');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: '' }),
      })
    );
  });

  it('renders required asterisk and error', () => {
    render(
      <DateField
        id="start"
        label="Start"
        value=""
        onChange={() => {}}
        required
        error="Required"
      />
    );
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('does not open calendar when disabled', () => {
    render(
      <DateField id="start" label="Start" value="2026-03-15" onChange={() => {}} disabled />
    );
    const btn = screen.getByLabelText('Open calendar');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(screen.queryByText('March 2026')).not.toBeInTheDocument();
  });

  it('calls onBlur when input loses focus', () => {
    const onBlur = jest.fn();
    render(
      <DateField id="start" label="Start" value="2026-03-15" onChange={() => {}} onBlur={onBlur} />
    );
    const input = screen.getByLabelText('Start');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalled();
  });
});
