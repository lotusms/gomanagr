/**
 * Unit tests for ServiceCombobox:
 * - Renders dropdown and Add button; placeholder/drawerTitle with and without industry
 * - Options: value not in list is prepended; unnamed service label
 * - onChange from dropdown; Add opens drawer; handleCreateService (success, error, no onServiceCreated)
 * - Drawer onClose and onCancel
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServiceCombobox from '@/components/dashboard/ServiceCombobox';

jest.mock('@/components/ui', () => ({
  Dropdown: ({ id, value, onChange, options, placeholder }) => (
    <div>
      <select
        data-testid="service-dropdown"
        aria-label={id}
        value={value}
        onChange={(e) => onChange && onChange(e)}
      >
        <option value="">{placeholder}</option>
        {(options || []).filter((o) => o.value).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
  Drawer: ({ isOpen, onClose, title, children }) =>
    isOpen ? (
      <div data-testid="service-drawer" role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <button type="button" data-testid="drawer-close" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

jest.mock('@/components/services/AddServiceForm', () => function MockAddServiceForm({ onSubmit, onCancel, saving }) {
  const handleSubmit = () => {
    const result = onSubmit?.({ name: 'New Service' });
    if (result != null && typeof result.then === 'function') result.catch(() => {});
  };
  return (
    <div data-testid="add-service-form">
      <button type="button" data-testid="form-submit" onClick={handleSubmit}>
        Submit
      </button>
      <button type="button" data-testid="form-cancel" onClick={onCancel}>
        Cancel
      </button>
      {saving && <span data-testid="saving">Saving...</span>}
    </div>
  );
});

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'services' ? 'Service' : t),
}));

jest.mock('react-icons/hi', () => ({
  HiPlus: () => <span data-testid="hi-plus">+</span>,
}));

describe('ServiceCombobox', () => {
  const mockOnChange = jest.fn();
  const mockOnServiceCreated = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnServiceCreated.mockClear();
  });

  it('renders dropdown and Add button with default placeholder', () => {
    render(<ServiceCombobox id="service" services={[]} value="" onChange={mockOnChange} />);
    expect(screen.getByTestId('service-dropdown')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveDisplayValue('Select service...');
  });

  it('uses custom placeholder when provided', () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[]}
        value=""
        onChange={mockOnChange}
        placeholder="Pick a service..."
      />
    );
    expect(screen.getByRole('combobox')).toHaveDisplayValue('Pick a service...');
  });

  it('renders service options from services prop', () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[{ id: 's1', name: 'Consultation' }, { id: 's2', name: 'Follow-up' }]}
        value=""
        onChange={mockOnChange}
      />
    );
    expect(screen.getByRole('option', { name: 'Consultation' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Follow-up' })).toBeInTheDocument();
  });

  it('prepends current value to options when value is not in services list', () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[{ id: 's1', name: 'Consultation' }]}
        value="Custom Service"
        onChange={mockOnChange}
      />
    );
    expect(screen.getByRole('option', { name: 'Custom Service' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Consultation' })).toBeInTheDocument();
  });

  it('does not duplicate value in options when value is in services list', () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[{ id: 's1', name: 'Consultation' }]}
        value="Consultation"
        onChange={mockOnChange}
      />
    );
    const options = screen.getAllByRole('option', { name: 'Consultation' });
    expect(options).toHaveLength(1);
  });

  it('excludes services with empty name from options (filtered by value)', () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[{ id: 's1', name: '' }]}
        value=""
        onChange={mockOnChange}
      />
    );
    expect(screen.queryByRole('option', { name: 'Unnamed Service' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveDisplayValue('Select service...');
  });

  it('calls onChange when dropdown value changes', async () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[{ id: 's1', name: 'Consultation' }]}
        value=""
        onChange={mockOnChange}
      />
    );
    await userEvent.selectOptions(screen.getByTestId('service-dropdown'), 'Consultation');
    expect(mockOnChange).toHaveBeenCalledWith('Consultation');
  });

  it('calls onChange with empty string when selecting placeholder option', async () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[{ id: 's1', name: 'Consultation' }]}
        value="Consultation"
        onChange={mockOnChange}
      />
    );
    await userEvent.selectOptions(screen.getByTestId('service-dropdown'), '');
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('opens drawer when Add button is clicked', async () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[]}
        value=""
        onChange={mockOnChange}
        onServiceCreated={mockOnServiceCreated}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByTestId('service-drawer')).toBeInTheDocument();
    expect(screen.getByText('Add service')).toBeInTheDocument();
  });

  it('closes drawer when Drawer onClose is clicked', async () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[]}
        value=""
        onChange={mockOnChange}
        onServiceCreated={mockOnServiceCreated}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.click(screen.getByTestId('drawer-close'));
    expect(screen.queryByTestId('service-drawer')).not.toBeInTheDocument();
  });

  it('closes drawer when AddServiceForm onCancel is clicked', async () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[]}
        value=""
        onChange={mockOnChange}
        onServiceCreated={mockOnServiceCreated}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.click(screen.getByTestId('form-cancel'));
    expect(screen.queryByTestId('service-drawer')).not.toBeInTheDocument();
  });

  it('handleCreateService: calls onServiceCreated, onChange with new name, closes drawer', async () => {
    mockOnServiceCreated.mockResolvedValue(undefined);
    render(
      <ServiceCombobox
        id="svc"
        services={[{ id: 's1', name: 'Existing' }]}
        value=""
        onChange={mockOnChange}
        onServiceCreated={mockOnServiceCreated}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.click(screen.getByTestId('form-submit'));
    expect(mockOnServiceCreated).toHaveBeenCalledWith([
      { id: 's1', name: 'Existing' },
      { name: 'New Service' },
    ]);
    expect(mockOnChange).toHaveBeenCalledWith('New Service');
    expect(screen.queryByTestId('service-drawer')).not.toBeInTheDocument();
  });

  it('handleCreateService: when onServiceCreated rejects, drawer stays open and error is logged', async () => {
    mockOnServiceCreated.mockRejectedValue(new Error('Save failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ServiceCombobox
        id="svc"
        services={[]}
        value=""
        onChange={mockOnChange}
        onServiceCreated={mockOnServiceCreated}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.click(screen.getByTestId('form-submit'));
    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    expect(mockOnChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('service-drawer')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('handleCreateService: when onServiceCreated is not provided, does not call onChange on submit', async () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[]}
        value=""
        onChange={mockOnChange}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.click(screen.getByTestId('form-submit'));
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('uses industry for placeholder and drawer title when industry provided', async () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[]}
        value=""
        onChange={mockOnChange}
        industry="healthcare"
      />
    );
    expect(screen.getByRole('combobox')).toHaveDisplayValue('Select service...');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText(/Add .*service/i)).toBeInTheDocument();
  });

  it('dropdown onChange with null target value calls onChange with empty string', () => {
    render(
      <ServiceCombobox
        id="svc"
        services={[{ id: 's1', name: 'A' }]}
        value="A"
        onChange={mockOnChange}
      />
    );
    const select = screen.getByTestId('service-dropdown');
    fireEvent.change(select, { target: { value: null } });
    expect(mockOnChange).toHaveBeenCalledWith('');
  });
});
