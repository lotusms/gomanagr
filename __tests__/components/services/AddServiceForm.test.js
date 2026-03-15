/**
 * Unit tests for AddServiceForm:
 * - Initial state from initialService vs preselectedTeamMemberIds
 * - Fetch next service ID (userId + organizationId)
 * - Duplicate name validation (submit and onBlur), excludeId when editing
 * - handleSubmit success, form preventDefault/stopPropagation
 * - Drawer vs page mode (assign read-only list vs ChipsMulti)
 * - Empty team members shows emptyAssignCopy
 * - Cancel, discardDialog, saving state
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddServiceForm from '@/components/services/AddServiceForm';

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick, disabled, type }) => (
    <button type={type || 'button'} onClick={onClick} disabled={disabled}>{children}</button>
  ),
  SecondaryButton: ({ children, onClick, disabled, type }) => (
    <button type={type || 'button'} onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  return {
    InputField: require('@/components/ui/InputField').default,
    TextareaField: require('@/components/ui/TextareaField').default,
    Dropdown: require('@/components/ui/Dropdown').default,
    useCancelWithConfirm: (onCancel) => ({
      handleCancel: onCancel,
      discardDialog: React.createElement('div', { 'data-testid': 'discard-dialog' }),
    }),
  };
});

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (industry, concept) => {
    const map = { teamMember: 'Team Member', team: 'Team', services: 'Services' };
    return map[concept] || concept;
  },
  getTermSingular: (plural) => (plural === 'Services' ? 'Service' : plural),
}));

describe('AddServiceForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    teamMembers: [],
    existingServices: [],
  };

  beforeEach(() => {
    defaultProps.onSubmit.mockClear();
    defaultProps.onCancel.mockClear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders empty form in drawer mode', () => {
    render(<AddServiceForm {...defaultProps} />);
    expect(screen.getByLabelText(/Service name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Service ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Billing type/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Haircut, Consultation/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Service/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('discard-dialog')).toBeInTheDocument();
  });

  it('shows empty assign copy when no team members', () => {
    render(<AddServiceForm {...defaultProps} />);
    expect(screen.getByText(/Add team member in the Team section to assign services/i)).toBeInTheDocument();
  });

  it('populates form from initialService', () => {
    const initialService = {
      id: 'svc-1',
      name: 'Consultation',
      description: 'Initial consult',
      assignedTeamMemberIds: ['u1'],
      service_number: 'SVC-001',
      cost_type: 'per_hour',
      cost_amount: '150.00',
    };
    render(
      <AddServiceForm
        {...defaultProps}
        initialService={initialService}
        teamMembers={[{ id: 'u1', name: 'Alice', isAdmin: false }]}
      />
    );
    expect(screen.getByDisplayValue('Consultation')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial consult')).toBeInTheDocument();
    expect(screen.getByDisplayValue('SVC-001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Service/i })).toBeInTheDocument();
  });

  it('preselects team members when preselectedTeamMemberIds provided', () => {
    render(
      <AddServiceForm
        {...defaultProps}
        mode="page"
        teamMembers={[{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }]}
        preselectedTeamMemberIds={['u1']}
      />
    );
    expect(screen.getByText('Assign to Team Member')).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('fetches suggested service ID when userId and organizationId provided', async () => {
    global.fetch.mockResolvedValue({ json: () => Promise.resolve({ suggestedId: 'SVC-2026-001' }) });
    render(
      <AddServiceForm
        {...defaultProps}
        userId="u1"
        organizationId="org-1"
      />
    );
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/get-next-service-id',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('userId'),
        })
      );
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue('SVC-2026-001')).toBeInTheDocument();
    });
  });

  it('sets error on submit when name is empty', async () => {
    render(<AddServiceForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Service/i }));
    await waitFor(() => {
      expect(screen.getByText(/Please enter a service name/i)).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('sets error on submit when name duplicates existing service', async () => {
    render(
      <AddServiceForm
        {...defaultProps}
        existingServices={[{ id: 's1', name: 'Haircut' }]}
      />
    );
    fireEvent.change(screen.getByLabelText(/Service name/i), { target: { value: 'Haircut' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Service/i }));
    await waitFor(() => {
      expect(screen.getByText(/A service named "Haircut" already exists/i)).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('sets error on blur when name duplicates existing service', async () => {
    render(
      <AddServiceForm
        {...defaultProps}
        existingServices={[{ id: 's1', name: 'Consultation' }]}
      />
    );
    const nameInput = screen.getByLabelText(/Service name/i);
    fireEvent.change(nameInput, { target: { value: 'Consultation' } });
    fireEvent.blur(nameInput);
    await waitFor(() => {
      expect(screen.getByText(/A service named "Consultation" already exists/i)).toBeInTheDocument();
    });
  });

  it('does not flag duplicate when editing same service (excludeId)', async () => {
    render(
      <AddServiceForm
        {...defaultProps}
        initialService={{ id: 's1', name: 'Haircut' }}
        existingServices={[{ id: 's1', name: 'Haircut' }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Update Service/i }));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1', name: 'Haircut' })
    );
  });

  it('calls onSubmit with service data on valid submit', async () => {
    render(<AddServiceForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Service name/i), { target: { value: 'New Service' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Desc' } });
    fireEvent.change(screen.getByLabelText(/Service ID/i), { target: { value: 'S-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Service/i }));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Service',
        description: 'Desc',
        service_number: 'S-1',
      })
    );
    const call = defaultProps.onSubmit.mock.calls[0][0];
    expect(call.id).toMatch(/^svc-\d+-[a-z0-9]+$/);
  });

  it('calls onSubmit with initialService id when editing', async () => {
    render(
      <AddServiceForm
        {...defaultProps}
        initialService={{ id: 'existing-1', name: 'Edit Me' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Update Service/i }));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'existing-1', name: 'Edit Me' })
    );
  });

  it('shows drawer-mode read-only assignment list when team members exist', () => {
    render(
      <AddServiceForm
        {...defaultProps}
        mode="drawer"
        teamMembers={[{ id: 'u1', name: 'Alice', isAdmin: false }]}
      />
    );
    expect(screen.getByText('Assign to Team Member')).toBeInTheDocument();
    expect(screen.getByText(/Assignments can only be changed from the Services page/i)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows ChipsMulti for assignment in page mode', () => {
    render(
      <AddServiceForm
        {...defaultProps}
        mode="page"
        teamMembers={[{ id: 'u1', name: 'Alice' }]}
      />
    );
    expect(screen.getByText('Assign to Team Member')).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('clears name error when user types after duplicate error', async () => {
    render(
      <AddServiceForm
        {...defaultProps}
        existingServices={[{ id: 's1', name: 'Haircut' }]}
      />
    );
    fireEvent.change(screen.getByLabelText(/Service name/i), { target: { value: 'Haircut' } });
    fireEvent.blur(screen.getByLabelText(/Service name/i));
    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Service name/i), { target: { value: 'Haircut X' } });
    expect(screen.queryByText(/already exists/i)).not.toBeInTheDocument();
  });

  it('calls onCancel when Cancel clicked', () => {
    render(<AddServiceForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('disables buttons when saving', () => {
    render(<AddServiceForm {...defaultProps} saving />);
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('uses industry placeholder when industry provided', () => {
    render(<AddServiceForm {...defaultProps} industry="salon" />);
    expect(screen.getByPlaceholderText(/e.g., enter service name/i)).toBeInTheDocument();
  });

  it('sorts team members with admin first then by name', () => {
    render(
      <AddServiceForm
        {...defaultProps}
        mode="drawer"
        teamMembers={[
          { id: 'u2', name: 'Zara', isAdmin: false },
          { id: 'u1', name: 'Alice', isAdmin: true },
        ]}
      />
    );
    const listItems = screen.getAllByRole('listitem');
    expect(listItems[0]).toHaveTextContent('Alice');
    expect(listItems[1]).toHaveTextContent('Zara');
  });

  it('submits form via form submit event (preventDefault path)', () => {
    render(<AddServiceForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Service name/i), { target: { value: 'Via Form' } });
    const form = screen.getByLabelText(/Service name/i).closest('form');
    fireEvent.submit(form);
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Via Form' })
    );
  });

  it('uses defaultCurrency for cost label', () => {
    render(<AddServiceForm {...defaultProps} defaultCurrency="EUR" />);
    expect(screen.getByLabelText(/Cost \(EUR\)/)).toBeInTheDocument();
  });
});
