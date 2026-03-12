/**
 * Unit tests for ClientForm
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ClientForm from '@/components/clients/ClientForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {}, asPath: '/' }),
}));

jest.mock('@/utils/formatPhone', () => ({
  formatPhone: (v) => (v ? `(${v.slice(0, 3)}) ${v.slice(3, 6)}-${v.slice(6)}` : ''),
  unformatPhone: (v) => (v ? v.replace(/\D/g, '') : ''),
}));

const mockGetStatesOfCountry = jest.fn(() => [{ isoCode: 'PA', name: 'Pennsylvania' }]);
jest.mock('country-state-city', () => ({
  State: { getStatesOfCountry: (...args) => mockGetStatesOfCountry(...args) },
}));

jest.mock('@/utils/countries', () => ({
  COUNTRIES: [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
  ],
}));

const mockOnCancel = jest.fn();
const mockOnSubmit = jest.fn();
jest.mock('@/components/ui', () => ({
  AddressAutocomplete: function MockAddressAutocomplete({ id, label, value, onChange, onSelect }) {
    return (
      <div data-testid="address-autocomplete">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onSelect && onSelect({ address1: '123 Main', city: 'Lancaster', state: 'PA', postalCode: '17601', country: 'US' })}
        />
      </div>
    );
  },
  useCancelWithConfirm: (onCancel, hasChanges) => ({
    handleCancel: () => (hasChanges ? undefined : onCancel()),
    discardDialog: null,
  }),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (industry, concept) => (industry === 'Healthcare' && concept === 'client' ? 'Patients' : 'Clients'),
  getTermSingular: (plural) => (plural === 'Patients' ? 'Patient' : 'Client'),
}));

describe('ClientForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStatesOfCountry.mockReturnValue([{ isoCode: 'PA', name: 'Pennsylvania' }]);
  });

  it('renders client name, phone, email and Is this a company toggle', () => {
    render(<ClientForm onCancel={mockOnCancel} onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText(/Client Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByText(/Is this a company/i)).toBeInTheDocument();
  });

  it('uses industry term when provided (e.g. Patient for Healthcare)', () => {
    render(<ClientForm onCancel={mockOnCancel} onSubmit={mockOnSubmit} industry="Healthcare" />);
    expect(screen.getByLabelText(/Patient Name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Patient/i })).toBeInTheDocument();
  });

  it('shows validation error when name is empty on submit', () => {
    const { container } = render(<ClientForm onCancel={mockOnCancel} onSubmit={mockOnSubmit} />);
    const form = container.querySelector('form');
    fireEvent.submit(form);
    expect(screen.getByText(/please enter a client name/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with trimmed name and optional fields when valid', () => {
    render(<ClientForm onCancel={mockOnCancel} onSubmit={mockOnSubmit} />);
    fireEvent.change(screen.getByLabelText(/Client Name/i), { target: { value: '  Jane Doe  ' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'jane@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Client/i }));
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Jane Doe',
        email: 'jane@test.com',
      })
    );
  });

  it('populates form when initialClient is provided', async () => {
    render(
      <ClientForm
        onCancel={mockOnCancel}
        onSubmit={mockOnSubmit}
        initialClient={{
          name: 'Acme Corp',
          email: 'acme@test.com',
          phone: '7171234567',
          company: 'Acme Inc',
          companyEmail: 'billing@acme.com',
          companyAddress: { address1: '1 Street', city: 'NYC', state: 'NY', postalCode: '10001', country: 'US' },
        }}
      />
    );
    expect(await screen.findByDisplayValue('Acme Corp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('acme@test.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Client/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Company details/i }));
    expect(screen.getByDisplayValue('Acme Inc')).toBeInTheDocument();
  });

  it('clears name error when user types in name field', () => {
    const { container } = render(<ClientForm onCancel={mockOnCancel} onSubmit={mockOnSubmit} />);
    fireEvent.submit(container.querySelector('form'));
    expect(screen.getByText(/please enter a client name/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Client Name/i), { target: { value: 'X' } });
    expect(screen.queryByText(/please enter a client name/i)).not.toBeInTheDocument();
  });

  it('shows company section when Is this a company is Yes', () => {
    render(<ClientForm onCancel={mockOnCancel} onSubmit={mockOnSubmit} />);
    expect(screen.queryByText(/Company details/i)).not.toBeInTheDocument();
    const switchEl = document.getElementById('is-company');
    expect(switchEl).toBeInTheDocument();
    fireEvent.click(switchEl);
    expect(screen.getByText(/Company details/i)).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked and no changes', () => {
    render(<ClientForm onCancel={mockOnCancel} onSubmit={mockOnSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables submit and Cancel when saving', () => {
    render(<ClientForm onCancel={mockOnCancel} onSubmit={mockOnSubmit} saving />);
    expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('includes company fields in submit when isCompany and company data filled', () => {
    render(<ClientForm onCancel={mockOnCancel} onSubmit={mockOnSubmit} />);
    fireEvent.change(screen.getByLabelText(/Client Name/i), { target: { value: 'Rep' } });
    fireEvent.click(document.getElementById('is-company'));
    fireEvent.change(screen.getByPlaceholderText(/Company name/i), { target: { value: 'Corp' } });
    fireEvent.change(screen.getByPlaceholderText(/company@example.com/i), { target: { value: 'c@c.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Client/i }));
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rep',
        company: 'Corp',
        companyEmail: 'c@c.com',
      })
    );
  });

});
