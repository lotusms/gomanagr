/**
 * Unit tests for TimeField: render, popup open/close, time select, options, click outside, disabled, variant
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimeField from '@/components/ui/TimeField';

jest.mock('@radix-ui/react-label', () => ({
  Root: ({ children, htmlFor, className }) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

jest.mock('react-icons/hi', () => ({
  HiClock: () => <span data-testid="clock-icon">🕐</span>,
}));

jest.mock('@/components/ui/formControlStyles', () => ({
  getInputClasses: (variant, hasError) => `input-${variant}-${hasError ? 'error' : 'default'}`,
  getLabelClasses: (variant) => `label-${variant}`,
}));

const mockBuildTimeSlots = jest.fn(() => ['08:00', '08:30', '09:00', '09:30']);
jest.mock('@/components/dashboard/scheduleTimeUtils', () => ({
  buildTimeSlots: (...args) => mockBuildTimeSlots(...args),
  parseHour: jest.requireActual('@/components/dashboard/scheduleTimeUtils').parseHour,
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatTime: (time, format) => (time ? `${time}${format === '12h' ? ' formatted' : ''}` : ''),
  parseFormattedTime: (val, format) => val || '',
}));

const mockUseOptionalUserAccount = jest.fn(() => ({ timeFormat: '24h' }));
jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: (...args) => mockUseOptionalUserAccount(...args),
}));

beforeAll(() => {
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = jest.fn();
  }
});

describe('TimeField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildTimeSlots.mockReturnValue(['08:00', '08:30', '09:00', '09:30']);
  });

  it('renders with label, id, value, and placeholder', () => {
    render(
      <TimeField
        id="time-1"
        label="Start time"
        value="09:00"
        placeholder="Pick a time"
      />
    );
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/09:00/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Pick a time')).toBeInTheDocument();
  });

  it('renders with required and error', () => {
    render(
      <TimeField id="t" label="Time" required error="Required field" />
    );
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Required field');
  });

  it('renders with variant dark', () => {
    render(
      <TimeField id="t" label="Time" variant="dark" />
    );
    const label = screen.getByText('Time');
    expect(label).toHaveClass('label-dark');
  });

  it('opens popup on input click and closes on time select', async () => {
    const onChange = jest.fn();
    render(
      <TimeField id="t" label="Time" value="" onChange={onChange} options={['08:00', '09:00']} />
    );
    expect(screen.queryByRole('button', { name: /08:00/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByPlaceholderText(/select time/i));
    expect(screen.getByRole('button', { name: '08:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '09:00' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '09:00' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { name: 't', value: '09:00' },
        currentTarget: { name: 't', value: '09:00' },
      })
    );
    expect(screen.queryByRole('button', { name: '09:00' })).not.toBeInTheDocument();
  });

  it('closes popup on click outside', async () => {
    render(
      <div>
        <TimeField id="t" label="Time" options={['08:00']} />
        <button type="button">Outside</button>
      </div>
    );
    await userEvent.click(screen.getByPlaceholderText(/select time/i));
    expect(screen.getByRole('button', { name: '08:00' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('button', { name: '08:00' })).not.toBeInTheDocument();
  });

  it('uses options as array of strings', async () => {
    render(
      <TimeField id="t" options={['10:00', '11:00']} />
    );
    await userEvent.click(screen.getByPlaceholderText(/select time/i));
    expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '11:00' })).toBeInTheDocument();
    expect(mockBuildTimeSlots).not.toHaveBeenCalled();
  });

  it('uses options as array of objects with value, label, disabled', async () => {
    const onChange = jest.fn();
    render(
      <TimeField
        id="t"
        options={[
          { value: '08:00', label: '8:00 AM', disabled: false },
          { value: '09:00', label: '9:00 AM', disabled: true },
        ]}
        onChange={onChange}
      />
    );
    await userEvent.click(screen.getByPlaceholderText(/select time/i));
    expect(screen.getByRole('button', { name: '8:00 AM' })).toBeInTheDocument();
    const disabledOption = screen.getByRole('button', { name: '9:00 AM' });
    expect(disabledOption).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: '8:00 AM' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ value: '08:00' }) })
    );

    await userEvent.click(screen.getByPlaceholderText(/select time/i));
    await userEvent.click(screen.getByRole('button', { name: '9:00 AM' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('builds time slots from businessHours when options not provided', () => {
    render(
      <TimeField id="t" businessHoursStart="09:00" businessHoursEnd="12:00" />
    );
    expect(mockBuildTimeSlots).toHaveBeenCalledWith('09:00', '12:00', '24h');
  });

  it('does not open popup when disabled', async () => {
    render(
      <TimeField id="t" disabled options={['08:00']} />
    );
    const input = screen.getByPlaceholderText(/select time/i);
    expect(input).toBeDisabled();
    await userEvent.click(input);
    expect(screen.queryByRole('button', { name: '08:00' })).not.toBeInTheDocument();
  });

  it('calls onBlur when input loses focus', async () => {
    const onBlur = jest.fn();
    render(
      <TimeField id="t" onBlur={onBlur} />
    );
    const input = screen.getByPlaceholderText(/select time/i);
    input.focus();
    input.blur();
    expect(onBlur).toHaveBeenCalled();
  });

  it('uses timeFormat from account when not provided', () => {
    mockUseOptionalUserAccount.mockReturnValue({ timeFormat: '12h' });
    render(
      <TimeField id="t" />
    );
    expect(mockBuildTimeSlots).toHaveBeenCalledWith('08:00', '18:00', '12h');
  });

  it('shows selected option with selected styling when value matches', async () => {
    render(
      <TimeField id="t" value="09:00" options={['08:00', '09:00', '10:00']} />
    );
    await userEvent.click(screen.getByPlaceholderText(/select time/i));
    const selectedBtn = screen.getByRole('button', { name: '09:00' });
    expect(selectedBtn).toHaveClass('bg-primary-600');
  });

  it('displays formatted value using formatTimeDisplay', () => {
    render(
      <TimeField id="t" value="14:30" />
    );
    expect(screen.getByDisplayValue(/14:30/)).toBeInTheDocument();
  });
});
