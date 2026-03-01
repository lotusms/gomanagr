/**
 * Unit tests for AppointmentRecurrence component:
 * - Renders recurring toggle; when off, no frequency/dates shown
 * - When on, shows Frequency, start/end dates, No end date checkbox
 * - Frequency "Specific days" shows day-of-week buttons (S M T W T F S)
 * - Frequency "Monthly" shows day-of-month dropdown
 * - onChange called with correct shape when toggling and changing options
 * - Value prop syncs controlled state
 */

import React from 'react';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import AppointmentRecurrence, { defaultRecurrence } from '@/components/dashboard/AppointmentRecurrence';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

describe('AppointmentRecurrence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders recurring appointment switch and is off by default', () => {
    const onChange = jest.fn();
    render(<AppointmentRecurrence onChange={onChange} />);

    expect(screen.getByText('Recurring appointment')).toBeInTheDocument();
    const switchEl = screen.getByRole('switch', { name: /recurring appointment/i });
    expect(switchEl).toBeInTheDocument();
    expect(switchEl).not.toBeChecked();

    expect(screen.queryByText(/frequency/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/recurrence start/i)).not.toBeInTheDocument();
  });

  it('shows frequency and date fields when recurring is turned on', async () => {
    const onChange = jest.fn();
    render(<AppointmentRecurrence onChange={onChange} minDate="2026-02-01" />);

    const switchEl = screen.getByRole('switch', { name: /recurring appointment/i });
    await act(async () => {
      fireEvent.click(switchEl);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        isRecurring: true,
        frequency: 'weekly',
        specificDays: [],
        monthlyDay: 1,
        noEndDate: false,
      })
    );

    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.getByLabelText(/recurrence start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recurrence end date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/no end date/i)).toBeInTheDocument();
  });

  it('shows day-of-week buttons when frequency is Specific days', () => {
    render(
      <AppointmentRecurrence
        value={{ isRecurring: true, frequency: 'specific_days', specificDays: [] }}
      />
    );

    expect(screen.getByText('Days of the week')).toBeInTheDocument();
    const section = screen.getByText('Days of the week').parentElement;
    const dayButtons = within(section).getAllByRole('button');
    expect(dayButtons.length).toBe(7);
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'W' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'F' })).toBeInTheDocument();
  });

  it('toggling a day calls onChange with updated specificDays', async () => {
    const onChange = jest.fn();
    render(
      <AppointmentRecurrence
        value={{ isRecurring: true, frequency: 'specific_days', specificDays: [] }}
        onChange={onChange}
      />
    );

    const mondayBtn = screen.getByRole('button', { name: 'M' });
    await act(async () => {
      fireEvent.click(mondayBtn);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        isRecurring: true,
        frequency: 'specific_days',
        specificDays: [1],
      })
    );
  });

  it('shows day-of-month dropdown when frequency is Monthly', () => {
    render(
      <AppointmentRecurrence
        value={{ isRecurring: true, frequency: 'monthly', monthlyDay: 15 }}
      />
    );

    expect(screen.getByText('Day of month')).toBeInTheDocument();
    const dayDropdown = document.getElementById('recurrence-monthly-day');
    expect(dayDropdown).toBeInTheDocument();
  });

  it('syncs from value prop when value is provided', () => {
    render(
      <AppointmentRecurrence
        value={{
          isRecurring: true,
          frequency: 'daily',
          recurrenceStart: '2026-03-01',
          recurrenceEnd: '2026-03-31',
          noEndDate: false,
        }}
      />
    );

    expect(screen.getByLabelText(/recurrence start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recurrence end date/i)).toBeInTheDocument();
    const switchEl = screen.getByRole('switch', { name: /recurring appointment/i });
    expect(switchEl).toBeChecked();
  });

  it('when noEndDate is true, end date field is hidden and message shown', () => {
    render(
      <AppointmentRecurrence
        value={{
          isRecurring: true,
          frequency: 'weekly',
          recurrenceStart: '2026-03-01',
          noEndDate: true,
        }}
      />
    );

    expect(screen.queryByLabelText(/recurrence end date/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no end date.*capped/i)).toBeInTheDocument();
  });

  it('defaultRecurrence returns expected shape', () => {
    const def = defaultRecurrence();
    expect(def).toEqual({
      isRecurring: false,
      frequency: 'weekly',
      specificDays: [],
      monthlyDay: 1,
      recurrenceStart: '',
      recurrenceEnd: null,
      noEndDate: false,
    });
  });

  it('respects disabled prop', () => {
    render(
      <AppointmentRecurrence
        value={{ isRecurring: true, frequency: 'specific_days' }}
        disabled={true}
      />
    );

    const switchEl = screen.getByRole('switch', { name: /recurring appointment/i });
    expect(switchEl).toBeDisabled();
  });
});
