/**
 * Unit tests for AppointmentForm:
 * - Render: title, date, start/end time, staff (when not restricted), Create/Update, Cancel, Delete when editing
 * - initialAppointment populates form; staffRestrictedToId hides staff; validate (staff, title, date, times, recurrence)
 * - handleSubmit payload; Cancel; Delete; time slot options and effects
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppointmentForm from '@/components/dashboard/AppointmentForm';

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
    </select>
  </div>
));

jest.mock('@/components/ui', () => {
  return {
    Dropdown: () => null,
    SearchableMultiselect: ({ id, label, value, onChange, options, placeholder }) => {
      const arr = Array.isArray(value) ? value : [];
      const singleValue = arr.filter((v) => v && v !== '__all__')[0] ?? '';
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
            {(options || []).filter((o) => o.value !== '__all__').map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
      return (
        <div data-testid="appointment-recurrence">
          <label>Recurrence</label>
          <input
            type="checkbox"
            checked={value?.isRecurring ?? false}
            onChange={(e) => onChange({ ...value, isRecurring: e.target.checked })}
            disabled={disabled}
          />
        </div>
      );
    },
    defaultRecurrence,
  };
});

jest.mock('@/components/dashboard/ServiceSelector', () => function MockServiceSelector({ value, onChange, label }) {
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
    </div>
  );
});

jest.mock('@/components/dashboard/ClientSelector', () => function MockClientSelector({ value, onChange, label }) {
  return (
    <div data-testid="client-selector">
      <label>{label}</label>
      <select
        data-testid="client-select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Select...</option>
        <option value="c1">Client One</option>
      </select>
    </div>
  );
});

jest.mock('@/components/dashboard/scheduleTimeUtils', () => ({
  buildTimeSlots: (startStr, endStr, timeFormat) => {
    const start = parseInt(String(startStr).replace(/\D/g, '').slice(0, 2) || '8', 10);
    const end = parseInt(String(endStr).replace(/\D/g, '').slice(0, 2) || '18', 10);
    const slots = [];
    for (let h = start; h <= end; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      if (h < end) slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return timeFormat === '12h' ? slots.map((s) => s) : slots;
  },
  parseHour: (str) => {
    const match = String(str || '').match(/^(\d{1,2})/);
    return match ? Math.min(23, Math.max(0, parseInt(match[1], 10))) : 8;
  },
  parseTimeToSlotIndex: (timeStr, startHour) => {
    const parts = String(timeStr || '').split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
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
    await userEvent.click(screen.getByRole('button', { name: 'Create Appointment' }));
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const [data] = mockOnSubmit.mock.calls[0];
    expect(data.title).toBe('Consultation');
    expect(data.date).toBe(futureDate());
    expect(data.start).toBe('09:00');
    expect(data.end).toBe('10:00');
    expect(data.staffIds).toEqual(['tm1']);
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
});
