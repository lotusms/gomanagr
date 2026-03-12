/**
 * Unit tests for ClientSelector:
 * - Renders label, dropdown with options (name, company, unnamedLabel), Add button when canAdd
 * - openClientDrawer / closeClientDrawer call onNestedDrawerChange
 * - handleAddClient: onAddClientLocally path (generate id, call callback, close); onClientAdd path (persist, success/error)
 * - Dropdown onChange; Drawer onClose
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientSelector from '@/components/dashboard/ClientSelector';

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick, disabled, ...rest }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui', () => ({
  Dropdown: ({ id, value, onChange, options, placeholder, disabled }) => (
    <div>
      <select
        data-testid="client-dropdown"
        aria-label={id}
        value={value}
        onChange={(e) => onChange && onChange(e)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {(options || []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
  Drawer: ({ isOpen, onClose, title, children }) =>
    isOpen ? (
      <div data-testid="client-drawer" role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <button type="button" data-testid="drawer-close" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

jest.mock('@/components/clients/ClientForm', () => function MockClientForm({ onSubmit, onCancel, saving }) {
  const handleSubmit = () => {
    const p = onSubmit({ name: 'New Client', company: 'Acme' });
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };
  return (
    <div data-testid="client-form">
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

jest.mock('@/utils/clientIdGenerator', () => ({
  generateClientId: jest.fn((existingIds) => `CL-${existingIds.length}-NEW`),
}));

jest.mock('react-icons/hi', () => ({
  HiPlus: () => <span>+</span>,
}));

describe('ClientSelector', () => {
  const mockOnChange = jest.fn();
  const mockOnClientAdd = jest.fn();
  const mockOnAddClientLocally = jest.fn();
  const mockOnNestedDrawerChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnClientAdd.mockClear();
    mockOnAddClientLocally.mockClear();
    mockOnNestedDrawerChange.mockClear();
  });

  it('renders label and dropdown with placeholder', () => {
    render(<ClientSelector clients={[]} onChange={mockOnChange} />);
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByTestId('client-dropdown')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveDisplayValue('Select client...');
  });

  it('renders client options with name only', () => {
    render(
      <ClientSelector
        clients={[{ id: 'c1', name: 'Alice' }]}
        onChange={mockOnChange}
      />
    );
    expect(screen.getByRole('option', { name: 'Alice' })).toBeInTheDocument();
  });

  it('renders client options with company as name (company)', () => {
    render(
      <ClientSelector
        clients={[{ id: 'c1', name: 'Alice', company: 'Acme Inc' }]}
        onChange={mockOnChange}
      />
    );
    expect(screen.getByRole('option', { name: 'Alice (Acme Inc)' })).toBeInTheDocument();
  });

  it('uses unnamedLabel when client has no name', () => {
    render(
      <ClientSelector
        clients={[{ id: 'c1' }]}
        onChange={mockOnChange}
        unnamedLabel="Unnamed client"
      />
    );
    expect(screen.getByRole('option', { name: 'Unnamed client' })).toBeInTheDocument();
  });

  it('calls onChange when dropdown value changes', async () => {
    render(
      <ClientSelector
        clients={[{ id: 'c1', name: 'Alice' }]}
        value=""
        onChange={mockOnChange}
      />
    );
    await userEvent.selectOptions(screen.getByTestId('client-dropdown'), 'c1');
    expect(mockOnChange).toHaveBeenCalledWith('c1');
  });

  it('calls onChange with empty string when selecting None', async () => {
    render(
      <ClientSelector
        clients={[{ id: 'c1', name: 'Alice' }]}
        value="c1"
        onChange={mockOnChange}
      />
    );
    await userEvent.selectOptions(screen.getByTestId('client-dropdown'), '');
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('calls onChange with empty string when dropdown change event has no target value', () => {
    render(
      <ClientSelector
        clients={[{ id: 'c1', name: 'Alice' }]}
        value="c1"
        onChange={mockOnChange}
      />
    );
    const select = screen.getByTestId('client-dropdown');
    fireEvent.change(select, { target: { value: null } });
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('does not show Add button when neither onClientAdd nor onAddClientLocally', () => {
    render(<ClientSelector clients={[]} onChange={mockOnChange} />);
    expect(screen.queryByTestId('add-client-from-drawer')).not.toBeInTheDocument();
  });

  it('shows Add button when onAddClientLocally is provided', () => {
    render(
      <ClientSelector
        clients={[]}
        onChange={mockOnChange}
        onAddClientLocally={mockOnAddClientLocally}
      />
    );
    expect(screen.getByTestId('add-client-from-drawer')).toBeInTheDocument();
  });

  it('shows Add button when onClientAdd is provided', () => {
    render(
      <ClientSelector
        clients={[]}
        onChange={mockOnChange}
        onClientAdd={mockOnClientAdd}
      />
    );
    expect(screen.getByTestId('add-client-from-drawer')).toBeInTheDocument();
  });

  it('opens drawer and calls onNestedDrawerChange(true) when Add is clicked', async () => {
    render(
      <ClientSelector
        clients={[]}
        onChange={mockOnChange}
        onAddClientLocally={mockOnAddClientLocally}
        onNestedDrawerChange={mockOnNestedDrawerChange}
      />
    );
    await userEvent.click(screen.getByTestId('add-client-from-drawer'));
    expect(screen.getByTestId('client-drawer')).toBeInTheDocument();
    expect(mockOnNestedDrawerChange).toHaveBeenCalledWith(true);
  });

  it('closes drawer and calls onNestedDrawerChange(false) when Cancel is clicked', async () => {
    render(
      <ClientSelector
        clients={[]}
        onChange={mockOnChange}
        onAddClientLocally={mockOnAddClientLocally}
        onNestedDrawerChange={mockOnNestedDrawerChange}
      />
    );
    await userEvent.click(screen.getByTestId('add-client-from-drawer'));
    await userEvent.click(screen.getByTestId('form-cancel'));
    expect(screen.queryByTestId('client-drawer')).not.toBeInTheDocument();
    expect(mockOnNestedDrawerChange).toHaveBeenCalledWith(false);
  });

  it('closes drawer via Drawer onClose and calls onNestedDrawerChange(false)', async () => {
    render(
      <ClientSelector
        clients={[]}
        onChange={mockOnChange}
        onAddClientLocally={mockOnAddClientLocally}
        onNestedDrawerChange={mockOnNestedDrawerChange}
      />
    );
    await userEvent.click(screen.getByTestId('add-client-from-drawer'));
    await userEvent.click(screen.getByTestId('drawer-close'));
    expect(screen.queryByTestId('client-drawer')).not.toBeInTheDocument();
    expect(mockOnNestedDrawerChange).toHaveBeenCalledWith(false);
  });

  it('handleAddClient with onAddClientLocally: generates id, calls onAddClientLocally, onChange, closes drawer', async () => {
    const { generateClientId } = require('@/utils/clientIdGenerator');
    render(
      <ClientSelector
        clients={[{ id: 'c1', name: 'Existing' }]}
        onChange={mockOnChange}
        onAddClientLocally={mockOnAddClientLocally}
      />
    );
    await userEvent.click(screen.getByTestId('add-client-from-drawer'));
    await userEvent.click(screen.getByTestId('form-submit'));
    expect(generateClientId).toHaveBeenCalledWith(['c1']);
    expect(mockOnAddClientLocally).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Client', company: 'Acme', id: 'CL-1-NEW' })
    );
    expect(mockOnChange).toHaveBeenCalledWith('CL-1-NEW');
    expect(screen.queryByTestId('client-drawer')).not.toBeInTheDocument();
  });

  it('handleAddClient with onClientAdd: on success calls onChange and closes drawer', async () => {
    mockOnClientAdd.mockResolvedValue('new-id-123');
    render(
      <ClientSelector
        clients={[]}
        onChange={mockOnChange}
        onClientAdd={mockOnClientAdd}
      />
    );
    await userEvent.click(screen.getByTestId('add-client-from-drawer'));
    await userEvent.click(screen.getByTestId('form-submit'));
    await waitFor(() => {
      expect(mockOnClientAdd).toHaveBeenCalledWith({ name: 'New Client', company: 'Acme' });
      expect(mockOnChange).toHaveBeenCalledWith('new-id-123');
    });
    await waitFor(() => {
      expect(screen.queryByTestId('client-drawer')).not.toBeInTheDocument();
    });
  });

  it('handleAddClient with onClientAdd: on reject does not call onChange and keeps drawer open', async () => {
    mockOnClientAdd.mockRejectedValue(new Error('Save failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ClientSelector
        clients={[]}
        onChange={mockOnChange}
        onClientAdd={mockOnClientAdd}
      />
    );
    await userEvent.click(screen.getByTestId('add-client-from-drawer'));
    await userEvent.click(screen.getByTestId('form-submit'));
    await waitFor(() => {
      expect(mockOnChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('client-drawer')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('handleAddClient with onClientAdd: when no newClientId returned does not close drawer', async () => {
    mockOnClientAdd.mockResolvedValue(null);
    render(
      <ClientSelector
        clients={[]}
        onChange={mockOnChange}
        onClientAdd={mockOnClientAdd}
      />
    );
    await userEvent.click(screen.getByTestId('add-client-from-drawer'));
    await userEvent.click(screen.getByTestId('form-submit'));
    expect(mockOnChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('client-drawer')).toBeInTheDocument();
  });

  it('does not render label when label is empty string', () => {
    const { container } = render(
      <ClientSelector clients={[]} onChange={mockOnChange} label="" />
    );
    const labels = container.querySelectorAll('label');
    expect(labels.length).toBe(0);
  });

  it('Drawer onClose is called with event and closes drawer', async () => {
    render(
      <ClientSelector
        clients={[]}
        onChange={mockOnChange}
        onAddClientLocally={mockOnAddClientLocally}
      />
    );
    await userEvent.click(screen.getByTestId('add-client-from-drawer'));
    await userEvent.click(screen.getByTestId('drawer-close'));
    expect(screen.queryByTestId('client-drawer')).not.toBeInTheDocument();
  });
});
