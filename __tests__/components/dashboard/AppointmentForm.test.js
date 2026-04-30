/**
 * Unit tests for AppointmentForm:
 * - Render: title, date, start/end time, staff (when not restricted), Create/Update, Cancel, Delete when editing
 * - initialAppointment populates form; staffRestrictedToId hides staff; validate (staff, title, date, times, recurrence)
 * - handleSubmit payload; Cancel; Delete; time slot options and effects
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppointmentForm from '@/components/dashboard/AppointmentForm';

var mockGetRecurrenceStateForEdit;
jest.mock('@/utils/appointmentRecurrence', () => {
  const actual = jest.requireActual('@/utils/appointmentRecurrence');
  mockGetRecurrenceStateForEdit = jest.fn((appointment, allAppointments) =>
    actual.getRecurrenceStateForEdit(appointment, allAppointments)
  );
  return {
    ...actual,
    getRecurrenceStateForEdit: (...args) => mockGetRecurrenceStateForEdit(...args),
  };
});

jest.mock('@/components/ui/InputField', () => function MockInputField({ id, label, value, onChange, error }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-label={label} value={value} onChange={onChange} data-error={error} />
    </div>
  );
});
jest.mock('@/components/ui/TextareaField', () => ({ id, label, value, onChange }) => (
  <div>
    <label htmlFor={id}>{label}</label>
    <textarea id={id} aria-label={label} value={value} onChange={onChange} />
  </div>
));
jest.mock('@/components/ui/DateField', () => ({ id, label, value, onChange, min, error }) => (
  <div>
    <label htmlFor={id}>{label}</label>
    <input
      id={id}
      type="date"
      aria-label={label}
      value={value}
      onChange={(e) => onChange && onChange({ target: { value: e.target.value } })}
      min={min}
      data-error={error}
    />
  </div>
));
jest.mock('@/components/ui/TimeField', () => ({ id, label, value, onChange, options = [], placeholder, error }) => (
  <div>
    <label htmlFor={id}>{label}</label>
    <select
      id={id}
      aria-label={label}
      data-timefield-id={id}
      value={value}
      onChange={(e) => onChange && onChange({ target: { value: e.target.value } })}
      data-error={error}
    >
      <option value="">{placeholder}</option>
      {(options || []).map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
      {id === 'endTime' && (
        <option value="08:00" data-testid="end-slot-before-start-for-test">
          08:00
        </option>
      )}
    </select>
  </div>
));

jest.mock('@/components/ui', () => {
  return {
    Dropdown: () => null,
    SearchableMultiselect: ({ id, label, value, onChange, options, placeholder }) => {
      const arr = Array.isArray(value) ? value : [];
      const singleValue = arr.filter((v) => v && v !== '__all__')[0] ?? '';
      const allMemberIds = (options || []).filter((o) => o.value !== '__all__').map((o) => o.value);
      return (
        <div>
          <label htmlFor={id}>{label}</label>
          <select
            id={id}
            aria-label={label}
            value={singleValue}
            onChange={(e) => {
              const v = e.target.value;
              onChange && onChange(v ? [v] : []);
            }}
          >
            <option value="">{placeholder}</option>
            {(options || []).map((opt) => (
              <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <button type="button" data-testid={`${id}-simulate-all-members`} onClick={() => onChange?.(['__all__', ...allMemberIds])}>
            simulate all members
          </button>
          <button type="button" data-testid={`${id}-simulate-clear-from-all`} onClick={() => onChange?.(allMemberIds)}>
            simulate clear meta all
          </button>
        </div>
      );
    },
    useCancelWithConfirm: (onCancel) => ({ handleCancel: onCancel, discardDialog: null }),
  };
});

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, type, disabled, ...rest }) => (
    <button type={type} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
  SecondaryButton: ({ children, type, onClick, disabled, ...rest }) => (
    <button type={type} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/dashboard/AppointmentRecurrence', () => {
  const defaultRecurrence = () => ({
    isRecurring: false,
    frequency: 'weekly',
    specificDays: [],
    monthlyDay: 1,
    recurrenceStart: '',
    recurrenceEnd: null,
    noEndDate: false,
  });
  return {
    __esModule: true,
    default: function MockAppointmentRecurrence({ value, onChange, disabled }) {
      const v = value || defaultRecurrence();
      return (
        <div data-testid="appointment-recurrence">
          <label>Recurrence</label>
          <input
            type="checkbox"
            checked={v.isRecurring ?? false}
            onChange={(e) => onChange({ ...v, isRecurring: e.target.checked })}
            disabled={disabled}
          />
          <input
            data-testid="recurrence-start-input"
            aria-label="Recurrence start"
            value={v.recurrenceStart || ''}
            onChange={(e) => onChange({ ...v, recurrenceStart: e.target.value })}
          />
          <input
            data-testid="recurrence-end-input"
            aria-label="Recurrence end"
            value={v.recurrenceEnd ?? ''}
            onChange={(e) => onChange({ ...v, recurrenceEnd: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              data-testid="recurrence-no-end"
              checked={!!v.noEndDate}
              onChange={(e) => onChange({ ...v, noEndDate: e.target.checked })}
            />
            No end date
          </label>
          <select
            data-testid="recurrence-frequency"
            aria-label="Recurrence frequency"
            value={v.frequency || 'weekly'}
            onChange={(e) => onChange({ ...v, frequency: e.target.value })}
          >
            <option value="weekly">weekly</option>
            <option value="specific_days">specific_days</option>
          </select>
        </div>
      );
    },
    defaultRecurrence,
  };
});

jest.mock('@/components/dashboard/ServiceSelector', () => function MockServiceSelector({
  value,
  onChange,
  label,
  onServiceCreated,
  onNestedDrawerChange,
}) {
  return (
    <div data-testid="service-selector">
      <label>{label}</label>
      <select
        data-testid="service-select"
        value={value?.[0] ?? ''}
        onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
      >
        <option value="">Select...</option>
        <option value="s1">Service One</option>
      </select>
      <button type="button" data-testid="trigger-service-created" onClick={() => onServiceCreated?.([{ id: 's-new', name: 'New service' }])}>
        trigger service created
      </button>
      <button type="button" data-testid="trigger-nested-drawer" onClick={() => onNestedDrawerChange?.(true)}>
        trigger nested drawer
      </button>
    </div>
  );
});

jest.mock('@/components/dashboard/ClientSelector', () => function MockClientSelector({
  value,
  onChange,
  label,
  onClientAdd,
  onAddClientLocally,
}) {
  const v = value ?? '';
  return (
    <div data-testid="client-selector">
      <label>{label}</label>
      <select
        data-testid="client-select"
        value={v}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Select...</option>
        <option value="c1">Client One</option>
        {v && v !== 'c1' ? (
          <option value={v}>Pending client</option>
        ) : null}
      </select>
      {!onClientAdd && (
        <button
          type="button"
          data-testid="add-local-client"
          onClick={() => onAddClientLocally?.({ id: 'local-1', name: 'Local client' })}
        >
          add local client
        </button>
      )}
    </div>
  );
});

jest.mock('@/components/dashboard/scheduleTimeUtils', () => ({
  buildTimeSlots: (startStr, endStr, timeFormat) => {
    if (timeFormat === '12h') {
      return ['8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '1:00 PM', '2:00 PM'];
    }
    const start = parseInt(String(startStr).replace(/\D/g, '').slice(0, 2) || '8', 10);
    const end = parseInt(String(endStr).replace(/\D/g, '').slice(0, 2) || '18', 10);
    const slots = [];
    for (let h = start; h <= end; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      if (h < end) slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots;
  },
  parseHour: (str) => {
    const match = String(str || '').match(/^(\d{1,2})/);
    return match ? Math.min(23, Math.max(0, parseInt(match[1], 10))) : 8;
  },
  parseTimeToSlotIndex: (timeStr, startHour) => {
    const str = String(timeStr || '');
    const match12 = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
    let h;
    let m;
    if (match12) {
      h = parseInt(match12[1], 10);
      m = parseInt(match12[2], 10);
      if (match12[3].toUpperCase() === 'PM' && h !== 12) h += 12;
      if (match12[3].toUpperCase() === 'AM' && h === 12) h = 0;
    } else {
      const parts = str.split(':').map(Number);
      h = parts[0] ?? 0;
      m = parts[1] ?? 0;
    }
    const start = parseInt(startHour, 10) || 8;
    return (h - start) * 2 + m / 30;
  },
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'teamMember' ? 'Team member' : t === 'client' ? 'Client' : t === 'services' ? 'Service' : t),
}));

const STABLE_APPOINTMENTS = [];
const STABLE_SERVICES = [];
const STABLE_CLIENTS = [];

describe('AppointmentForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnDelete = jest.fn();

  function futureDate(daysFromNow = 7) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
  }

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
    mockOnDelete.mockClear();
    const actual = jest.requireActual('@/utils/appointmentRecurrence');
    mockGetRecurrenceStateForEdit.mockImplementation((a, b) => actual.getRecurrenceStateForEdit(a, b));
  });

  function renderForm(props = {}) {
    const {
      appointments = STABLE_APPOINTMENTS,
      services = STABLE_SERVICES,
      clients = STABLE_CLIENTS,
      ...rest
    } = props;
    return render(
      <AppointmentForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
        appointments={appointments}
        services={services}
        clients={clients}
        teamMembers={[{ id: 'tm1', name: 'Alice' }]}
        businessHoursStart="08:00"
        businessHoursEnd="18:00"
        timezone="UTC"
        dateFormat="MM/DD/YYYY"
        {...rest}
      />
    );
  }

  it('renders form with title, date, start/end time, and Create Appointment button', () => {
    renderForm();
    expect(screen.getByLabelText('Appointment title')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Time')).toBeInTheDocument();
    expect(screen.getByLabelText('End Time')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Appointment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('does not show Delete when not editing', () => {
    renderForm();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('shows Delete and Update Appointment when initialAppointment and onDelete provided', () => {
    renderForm({
      initialAppointment: {
        id: 'apt1',
        title: 'Meeting',
        date: '2025-06-15',
        start: '09:00',
        end: '10:00',
        staffId: 'tm1',
      },
    });
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Appointment' })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('does not call onSubmit when staff not selected', async () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }] });
    await userEvent.type(screen.getByLabelText('Appointment title'), 'Test');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    await userEvent.selectOptions(screen.getByLabelText('Start Time'), screen.getByLabelText('Start Time').querySelector('option[value="09:00"]'));
    await userEvent.selectOptions(screen.getByLabelText('End Time'), screen.getByLabelText('End Time').querySelector('option[value="10:00"]'));
    const submitBtn = screen.getByRole('button', { name: 'Create Appointment' });
    await userEvent.click(submitBtn);
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Please select at least one team member/i)).toBeInTheDocument();
  });

  it('calls onSubmit with payload when form is valid', async () => {
    renderForm({
      teamMembers: [{ id: 'tm1', name: 'Alice' }],
      services: [{ id: 's1', name: 'Consultation', assignedTeamMemberIds: ['tm1'] }],
    });
    await userEvent.type(screen.getByLabelText('Appointment title'), 'Consultation');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    const startSelect = screen.getByLabelText('Start Time');
    await userEvent.selectOptions(startSelect, '09:00');
    const endSelect = screen.getByLabelText('End Time');
    await userEvent.selectOptions(endSelect, '10:00');
    const staffSelect = screen.getByLabelText(/team member/i);
    await userEvent.selectOptions(staffSelect, 'tm1');
    await userEvent.selectOptions(screen.getByTestId('service-select'), 's1');
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const [data] = mockOnSubmit.mock.calls[0];
    expect(data.title).toBe('Consultation');
    expect(data.date).toBe(futureDate());
    expect(data.start).toBe('09:00');
    expect(data.end).toBe('10:00');
    expect(data.staffIds).toEqual(['tm1']);
    expect(data.services).toEqual(['Consultation']);
  });

  it('shows staff dropdown when staffRestrictedToId is not set', () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }, { id: 'tm2', name: 'Bob' }] });
    expect(screen.getByLabelText('teamMember')).toBeInTheDocument();
  });

  it('hides staff dropdown when staffRestrictedToId is set', () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }], staffRestrictedToId: 'tm1' });
    expect(screen.queryByLabelText(/team member/i)).not.toBeInTheDocument();
  });

  it('populates form in edit mode when initialAppointment is provided', () => {
    renderForm({
      initialAppointment: {
        id: 'apt1',
        title: 'Existing Meeting',
        date: '2025-06-16',
        start: '10:00',
        end: '11:00',
        staffId: 'tm1',
        label: 'Notes here',
        clientId: 'c1',
      },
      services: [{ id: 's1', name: 'Consultation', assignedTeamMemberIds: ['tm1'] }],
    });
    expect(screen.getByDisplayValue('Existing Meeting')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-06-16')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Notes here')).toBeInTheDocument();
  });

  it('calls onDelete when Delete is clicked in edit mode', async () => {
    renderForm({
      initialAppointment: { id: 'apt1', title: 'Meeting', date: '2025-06-15', start: '09:00', end: '10:00', staffId: 'tm1' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('submit button shows Saving... when saving is true', () => {
    renderForm({ saving: true });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });

  it('validates required title', async () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }] });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    const startSelect = screen.getByLabelText('Start Time');
    await userEvent.selectOptions(startSelect, '09:00');
    await userEvent.selectOptions(screen.getByLabelText('End Time'), '10:00');
    const staffSelect = screen.getByLabelText(/team member/i);
    await userEvent.selectOptions(staffSelect, 'tm1');
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Appointment title')).toHaveAttribute('data-error', 'Appointment title is required');
  });

  it('validates required date', async () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }] });
    await userEvent.type(screen.getByLabelText('Appointment title'), 'Test');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });
    const staffSelect = screen.getByLabelText(/team member/i);
    await userEvent.selectOptions(staffSelect, 'tm1');
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Date')).toHaveAttribute('data-error', 'Please select a date');
  });

  it('validates end time when missing or before start time', async () => {
    renderForm({
      teamMembers: [{ id: 'tm1', name: 'Alice' }],
    });
    await userEvent.type(screen.getByLabelText('Appointment title'), 'Test');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    await userEvent.selectOptions(screen.getByLabelText('Start Time'), '09:00');
    const staffSelect = screen.getByLabelText(/team member/i);
    await userEvent.selectOptions(staffSelect, 'tm1');
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('End Time')).toHaveAttribute('data-error', 'Please select an end time');
  });

  it('shows recurrence validation when recurring is on but start date missing', async () => {
    renderForm({
      teamMembers: [{ id: 'tm1', name: 'Alice' }],
    });
    await userEvent.type(screen.getByLabelText('Appointment title'), 'Recurring');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    await userEvent.selectOptions(screen.getByLabelText('Start Time'), '09:00');
    await userEvent.selectOptions(screen.getByLabelText('End Time'), '10:00');
    await userEvent.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
    const recurrenceCheckbox = screen.getByTestId('appointment-recurrence').querySelector('input[type="checkbox"]');
    await userEvent.click(recurrenceCheckbox);
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Recurrence start date is required/i)).toBeInTheDocument();
  });

  it('clamps selectedDate to today when selectedDate is in the past', () => {
    renderForm({ selectedDate: new Date('2000-01-01'), timezone: 'UTC' });
    expect(screen.getByLabelText('Date').value).not.toBe('2000-01-01');
  });

  it('merges initialAppointment.recurrence when getRecurrenceStateForEdit returns null', () => {
    mockGetRecurrenceStateForEdit.mockReturnValue(null);
    renderForm({
      initialAppointment: {
        id: 'apt1',
        title: 'R',
        date: '2030-06-01',
        start: '09:00',
        end: '10:00',
        staffId: 'tm1',
        recurrence: { isRecurring: true, frequency: 'monthly', monthlyDay: 15, recurrenceStart: '2030-06-01' },
      },
    });
    expect(screen.getByDisplayValue('R')).toBeInTheDocument();
  });

  it('select all members then clear-all meta clears staff selection', async () => {
    renderForm({
      teamMembers: [
        { id: 'tm1', name: 'Alice' },
        { id: 'tm2', name: 'Bob' },
      ],
    });
    await userEvent.click(screen.getByTestId('staffIds-simulate-all-members'));
    await userEvent.click(screen.getByTestId('staffIds-simulate-clear-from-all'));
    await userEvent.type(screen.getByLabelText('Appointment title'), 'X');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    await userEvent.selectOptions(screen.getByLabelText('Start Time'), '09:00');
    await userEvent.selectOptions(screen.getByLabelText('End Time'), '10:00');
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submit includes all staff when all-members shortcut is used', async () => {
    renderForm({
      teamMembers: [
        { id: 'tm1', name: 'Alice' },
        { id: 'tm2', name: 'Bob' },
      ],
    });
    await userEvent.click(screen.getByTestId('staffIds-simulate-all-members'));
    await userEvent.type(screen.getByLabelText('Appointment title'), 'Team');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    await userEvent.selectOptions(screen.getByLabelText('Start Time'), '09:00');
    await userEvent.selectOptions(screen.getByLabelText('End Time'), '10:00');
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    const staffIds = mockOnSubmit.mock.calls[0][0].staffIds;
    expect(staffIds).toHaveLength(2);
    expect(staffIds).toEqual(expect.arrayContaining(['tm1', 'tm2']));
  });

  it('validates end time must be after start time', async () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }] });
    await userEvent.type(screen.getByLabelText('Appointment title'), 'Bad range');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    await userEvent.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
    await userEvent.selectOptions(screen.getByLabelText('Start Time'), '11:00');
    await userEvent.selectOptions(screen.getByLabelText('End Time'), '08:00');
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('End Time')).toHaveAttribute('data-error', 'End time must be after start time');
  });

  it('resets a past date to today in timezone for new appointments', async () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }], timezone: 'UTC' });
    const dateInput = screen.getByLabelText('Date');
    fireEvent.change(dateInput, { target: { value: '1999-01-01' } });
    await waitFor(() => {
      expect(dateInput.value).not.toBe('1999-01-01');
    });
  });

  it('validates recurrence end date when no end date is unchecked', async () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }] });
    await userEvent.type(screen.getByLabelText('Appointment title'), 'Rec');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    await userEvent.selectOptions(screen.getByLabelText('Start Time'), '09:00');
    await userEvent.selectOptions(screen.getByLabelText('End Time'), '10:00');
    await userEvent.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
    await userEvent.click(screen.getByTestId('appointment-recurrence').querySelector('input[type="checkbox"]'));
    fireEvent.change(screen.getByTestId('recurrence-start-input'), { target: { value: futureDate(1) } });
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Recurrence end date is required/i)).toBeInTheDocument();
  });

  it('validates recurrence end before start', async () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }] });
    await userEvent.type(screen.getByLabelText('Appointment title'), 'Rec');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    await userEvent.selectOptions(screen.getByLabelText('Start Time'), '09:00');
    await userEvent.selectOptions(screen.getByLabelText('End Time'), '10:00');
    await userEvent.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
    await userEvent.click(screen.getByTestId('appointment-recurrence').querySelector('input[type="checkbox"]'));
    fireEvent.change(screen.getByTestId('recurrence-start-input'), { target: { value: '2030-06-10' } });
    fireEvent.change(screen.getByTestId('recurrence-end-input'), { target: { value: '2030-06-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Recurrence end must be on or after start date/i)).toBeInTheDocument();
  });

  it('validates specific_days recurrence requires at least one day', async () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }] });
    await userEvent.type(screen.getByLabelText('Appointment title'), 'Rec');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    await userEvent.selectOptions(screen.getByLabelText('Start Time'), '09:00');
    await userEvent.selectOptions(screen.getByLabelText('End Time'), '10:00');
    await userEvent.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
    await userEvent.click(screen.getByTestId('appointment-recurrence').querySelector('input[type="checkbox"]'));
    fireEvent.change(screen.getByTestId('recurrence-start-input'), { target: { value: futureDate(1) } });
    fireEvent.change(screen.getByTestId('recurrence-end-input'), { target: { value: futureDate(10) } });
    await userEvent.selectOptions(screen.getByTestId('recurrence-frequency'), 'specific_days');
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Please select at least one day of the week/i)).toBeInTheDocument();
  });

  it('calls onAddClientLocally when adding a client without onClientAdd', async () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }] });
    await userEvent.click(screen.getByTestId('add-local-client'));
    await waitFor(() => {
      expect(screen.getByTestId('client-select')).toHaveValue('local-1');
    });
  });

  it('calls onServiceCreated and onNestedDrawerChange from ServiceSelector', async () => {
    const onServiceCreated = jest.fn();
    const onNestedDrawerChange = jest.fn();
    renderForm({
      teamMembers: [{ id: 'tm1', name: 'Alice' }],
      onServiceCreated,
      onNestedDrawerChange,
    });
    await userEvent.click(screen.getByTestId('trigger-service-created'));
    expect(onServiceCreated).toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('trigger-nested-drawer'));
    expect(onNestedDrawerChange).toHaveBeenCalledWith(true);
  });

  it('updates notes field', async () => {
    renderForm({ teamMembers: [{ id: 'tm1', name: 'Alice' }] });
    await userEvent.type(screen.getByLabelText('Notes'), 'Bring docs');
    expect(screen.getByLabelText('Notes')).toHaveValue('Bring docs');
  });

  it('clears end time in edit mode when initial end does not match any slot', () => {
    renderForm({
      initialAppointment: {
        id: 'apt1',
        title: 'E',
        date: '2030-01-10',
        start: '09:00',
        end: '23:59',
        staffId: 'tm1',
      },
    });
    expect(screen.getByLabelText('End Time').value).toBe('');
  });

  it('uses getRecurrenceStateForEdit when it returns a resolved recurrence object', () => {
    mockGetRecurrenceStateForEdit.mockReturnValue({
      isRecurring: true,
      frequency: 'weekly',
      recurrenceStart: '2030-02-01',
      recurrenceEnd: '2030-03-01',
      noEndDate: false,
      specificDays: [],
      monthlyDay: 1,
    });
    renderForm({
      initialAppointment: {
        id: 'apt-series',
        title: 'Series',
        date: '2030-02-01',
        start: '09:00',
        end: '10:00',
        staffId: 'tm1',
      },
    });
    expect(screen.getByDisplayValue('Series')).toBeInTheDocument();
  });

  it('submit includes trimmed notes as label', async () => {
    renderForm({
      teamMembers: [{ id: 'tm1', name: 'Alice' }],
      services: [{ id: 's1', name: 'Consultation', assignedTeamMemberIds: ['tm1'] }],
    });
    await userEvent.type(screen.getByLabelText('Appointment title'), 'Visit');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: futureDate() } });
    await userEvent.selectOptions(screen.getByLabelText('Start Time'), '09:00');
    await userEvent.selectOptions(screen.getByLabelText('End Time'), '10:00');
    await userEvent.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
    await userEvent.type(screen.getByLabelText('Notes'), '  Door code  ');
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit.mock.calls[0][0].label).toBe('Door code');
  });
});
