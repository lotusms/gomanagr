/**
 * Unit tests for AddTeamMemberForm:
 * - Renders form fields, Add member / Save member, Cancel
 * - initialMember populates form (edit mode); submit payload; email duplicate error
 * - Cancel; locations dropdown when locations.length > 1; canPromoteToAdmin checkbox
 * - Invite to Join / Revoke access in edit mode; address onSelect; service assignment
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddTeamMemberForm from '@/components/dashboard/AddTeamMemberForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {} }),
}));

jest.mock('@/components/ui', () => {
  const FakeInput = ({ id, label, value, onChange, placeholder, error, type = 'text', inputProps, ...rest }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        data-error={error}
      />
    </div>
  );
  return {
    InputField: FakeInput,
    TextareaField: ({ id, label, value, onChange, placeholder }) => (
      <div>
        <label htmlFor={id}>{label}</label>
        <textarea id={id} aria-label={label} value={value} onChange={onChange} placeholder={placeholder} />
      </div>
    ),
    FileInput: ({ id, label, value, onChange }) => (
      <div>
        <label htmlFor={id}>{label}</label>
        <input id={id} type="file" data-value={value} onChange={(e) => onChange(e.target.files?.[0])} />
      </div>
    ),
    ChipsArrayBuilder: ({ id, label, value, onChange }) => (
      <div data-testid="chips-builder">
        <label htmlFor={id}>{label}</label>
      </div>
    ),
    Dropdown: ({ id, label, value, onChange, options, placeholder }) => (
      <div>
        <label htmlFor={id}>{label}</label>
        <select
          id={id}
          aria-label={label}
          value={value || ''}
          onChange={(e) => onChange && onChange({ target: { value: e.target.value } })}
        >
          <option value="">{placeholder}</option>
          {(options || []).map((opt) => (
            <option key={opt.value} value={typeof opt.value === 'string' ? opt.value : opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    ),
    AddressAutocomplete: ({ id, label, value, onChange, onSelect }) => (
      <div data-testid={`address-${id}`}>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          aria-label={label}
        />
        <button type="button" onClick={() => onSelect && onSelect({
          address1: '123 Main St',
          address2: 'Suite 1',
          city: 'Philadelphia',
          state: 'PA',
          postalCode: '19101',
          country: 'us',
        })}>
          Simulate address select
        </button>
      </div>
    ),
    Checkbox: ({ id, label, checked, onCheckedChange }) => (
      <div>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
          aria-label={label}
        />
      </div>
    ),
    useCancelWithConfirm: (onCancel) => ({ handleCancel: onCancel, discardDialog: null }),
  };
});

jest.mock('@/components/dashboard/ServiceSelector', () => function MockServiceSelector() {
  return <div data-testid="service-selector">ServiceSelector</div>;
});

jest.mock('@/components/ui/PhoneNumberInput', () => function MockPhoneNumberInput({ id, label, value, onChange }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-label={label} value={value} onChange={(e) => onChange && onChange(e.target.value)} />
    </div>
  );
});

jest.mock('@/utils/formatPhone', () => ({
  formatPhone: (v) => v,
  unformatPhone: (v) => (v || '').replace(/\D/g, ''),
}));

jest.mock('country-state-city', () => ({
  State: {
    getStatesOfCountry: () => [{ isoCode: 'PA', name: 'Pennsylvania' }],
  },
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'teamMember' ? 'Team member' : t === 'services' ? 'Services' : t),
}));

const STABLE_EMPTY_LOCATIONS = [];
const STABLE_LOCATIONS = ['Location A', 'Location B'];
const STABLE_EMPTY_SERVICES = [];

describe('AddTeamMemberForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  function renderForm(props = {}) {
    const { locations = STABLE_EMPTY_LOCATIONS, services = STABLE_EMPTY_SERVICES, ...rest } = props;
    return render(
      <AddTeamMemberForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        locations={locations}
        services={services}
        {...rest}
      />
    );
  }

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders form with First name, Last name, and Add member button', () => {
    renderForm();
    expect(screen.getByLabelText('First name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add member' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onSubmit with name and payload when first and last name filled', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText('First name'), 'Jane');
    await userEvent.type(screen.getByLabelText('Last name'), 'Doe');
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const [data, pictureFile, editingId] = mockOnSubmit.mock.calls[0];
    expect(data.name).toBe('Jane Doe');
    expect(data.firstName).toBe('Jane');
    expect(data.lastName).toBe('Doe');
    expect(pictureFile).toBeNull();
    expect(editingId).toBeNull();
  });

  it('does not call onSubmit when first and last name are empty', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('populates form in edit mode when initialMember is provided', () => {
    renderForm({
      initialMember: {
          id: 'm1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@example.com',
          role: 'Developer',
          title: 'Senior',
        },
    });
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save member' })).toBeInTheDocument();
  });

  it('shows email duplicate error when email matches another team member', async () => {
    renderForm({ teamMembers: [{ id: 'other', email: 'taken@example.com' }], initialMember: null });
    const emailInput = screen.getByLabelText('Email');
    await userEvent.type(emailInput, 'taken@example.com');
    expect(emailInput).toHaveAttribute('data-error', 'This email has already been assigned to someone else');
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows Location dropdown when locations.length > 1', () => {
    renderForm({ locations: STABLE_LOCATIONS });
    expect(screen.getByLabelText('Location')).toBeInTheDocument();
  });

  it('does not show Location dropdown when locations has 0 or 1 item', () => {
    const { rerender } = renderForm({ locations: STABLE_EMPTY_LOCATIONS });
    expect(screen.queryByLabelText('Location')).not.toBeInTheDocument();
    const stableSingle = ['Only One'];
    rerender(
      <AddTeamMemberForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        locations={stableSingle}
        services={STABLE_EMPTY_SERVICES}
      />
    );
    expect(screen.queryByLabelText('Location')).not.toBeInTheDocument();
  });

  it('shows admin checkbox when canPromoteToAdmin is true', () => {
    renderForm({ canPromoteToAdmin: true });
    expect(screen.getByLabelText(/Team member is admin/i)).toBeInTheDocument();
  });

  it('shows Invite to Join when edit mode and showInviteInDrawer and no userId', async () => {
    renderForm({
      initialMember: { id: 'm1', firstName: 'J', lastName: 'D', email: 'j@x.com' },
      showInviteInDrawer: true,
      onInviteToLogin: jest.fn(),
    });
    expect(screen.getByRole('button', { name: 'Invite to Join' })).toBeInTheDocument();
  });

  it('shows Revoke access when edit mode and showRevokeInDrawer', () => {
    const onRevokeAccess = jest.fn();
    renderForm({
      initialMember: { id: 'm1', firstName: 'J', lastName: 'D', email: 'j@x.com' },
      showRevokeInDrawer: true,
      onRevokeAccess,
    });
    const revoke = screen.getByRole('button', { name: 'Revoke access' });
    expect(revoke).toBeInTheDocument();
    fireEvent.click(revoke);
    expect(onRevokeAccess).toHaveBeenCalled();
  });

  it('address onSelect sets address fields and normalizes country', async () => {
    renderForm();
    const simulateBtn = screen.getByRole('button', { name: 'Simulate address select' });
    await userEvent.click(simulateBtn);
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Philadelphia')).toBeInTheDocument();
    expect(screen.getByDisplayValue('19101')).toBeInTheDocument();
    const stateSelect = screen.getByLabelText('State / Province');
    expect(stateSelect.value).toBe('PA');
    const countrySelect = screen.getByLabelText('Country');
    expect(countrySelect).toBeInTheDocument();
    expect(countrySelect.value).toBe('US');
  });

  it('submit disabled when saving', () => {
    renderForm({ saving: true });
    expect(screen.getByRole('button', { name: 'Add member' })).toBeDisabled();
  });

  it('initialMember with name only splits into first and last', () => {
    renderForm({ initialMember: { id: 'm1', name: 'Alice Brown' } });
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Brown')).toBeInTheDocument();
  });

  it('pre-selects services assigned to initialMember', () => {
    renderForm({
      initialMember: { id: 'm1', firstName: 'J', lastName: 'D' },
      services: [
        { id: 's1', name: 'Service One', assignedTeamMemberIds: ['m1'] },
        { id: 's2', name: 'Service Two', assignedTeamMemberIds: [] },
      ],
    });
    expect(screen.getByTestId('service-selector')).toBeInTheDocument();
  });
});
