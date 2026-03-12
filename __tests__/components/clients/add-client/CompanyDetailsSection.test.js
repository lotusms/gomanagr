/**
 * Unit tests for CompanyDetailsSection:
 * - Renders company name, phone, email, website, industry, size
 * - Renders Company Address and billing checkbox
 * - normalizeCountryValue helper; Website onBlur; address onSelect; billing checkbox and fields
 */

import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompanyDetailsSection, { normalizeCountryValue } from '@/components/clients/add-client/CompanyDetailsSection';

jest.mock('@/components/ui', () => ({
  AddressAutocomplete: function MockAddressAutocomplete({ id, label, onSelect, onChange, placeholder }) {
    return (
      <div data-testid={`address-${id}`}>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          aria-label={label}
          placeholder={placeholder}
          onChange={(e) => onChange && onChange(e.target.value)}
        />
        <button type="button" onClick={() => onSelect && onSelect({
          address1: '123 Main St',
          address2: 'Suite 1',
          city: 'Philadelphia',
          state: 'PA',
          postalCode: '19101',
          country: 'us',
        })}>
          Simulate select
        </button>
      </div>
    );
  },
  PhoneNumberInput: function MockPhoneNumberInput({ id, label }) {
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input id={id} aria-label={label} />
      </div>
    );
  },
}));

const noop = () => {};
const defaultHandlers = {
  onCompanyNameChange: noop,
  onCompanyPhoneChange: noop,
  onCompanyEmailChange: noop,
  onCompanyWebsiteChange: noop,
  onCompanyIndustryChange: noop,
  onCompanySizeChange: noop,
  onBillingAddressDifferentChange: noop,
  onCompanyAddress1Change: noop,
  onCompanyAddress2Change: noop,
  onCompanyCityChange: noop,
  onCompanyStateChange: noop,
  onCompanyPostalCodeChange: noop,
  onCompanyCountryChange: noop,
  onBillingAddress1Change: noop,
  onBillingAddress2Change: noop,
  onBillingCityChange: noop,
  onBillingStateChange: noop,
  onBillingPostalCodeChange: noop,
  onBillingCountryChange: noop,
  onTaxIdChange: noop,
  onTimezoneChange: noop,
  onLanguageChange: noop,
  onPrimaryContactNameChange: noop,
  onPrimaryContactPhoneChange: noop,
  onPrimaryContactEmailChange: noop,
  onSecondaryContactNameChange: noop,
  onSecondaryContactPhoneChange: noop,
  onSecondaryContactEmailChange: noop,
};

const defaultProps = {
  companyName: '',
  companyPhone: '',
  companyEmail: '',
  companyWebsite: '',
  companyIndustry: '',
  companySize: '',
  billingAddressDifferent: false,
  companyAddress1: '',
  companyAddress2: '',
  companyCity: '',
  companyState: '',
  companyPostalCode: '',
  companyCountry: '',
  billingAddress1: '',
  billingAddress2: '',
  billingCity: '',
  billingState: '',
  billingPostalCode: '',
  billingCountry: '',
  taxId: '',
  timezone: '',
  language: '',
  primaryContactName: '',
  primaryContactPhone: '',
  primaryContactEmail: '',
  secondaryContactName: '',
  secondaryContactPhone: '',
  secondaryContactEmail: '',
  sortedCountries: [],
  companyAvailableStates: [],
  billingAvailableStates: [],
  saving: false,
  ...defaultHandlers,
};

describe('CompanyDetailsSection', () => {
  it('renders Company Name field', () => {
    render(<CompanyDetailsSection {...defaultProps} companyName="Acme Inc" />);
    expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme Inc')).toBeInTheDocument();
  });

  it('renders Company Phone and Company Email labels', () => {
    render(<CompanyDetailsSection {...defaultProps} />);
    expect(screen.getByLabelText('Company Phone')).toBeInTheDocument();
    expect(screen.getByLabelText('Company Email')).toBeInTheDocument();
  });

  it('renders Website, Industry, Company Size section', () => {
    render(<CompanyDetailsSection {...defaultProps} />);
    expect(screen.getByLabelText('Website')).toBeInTheDocument();
    expect(screen.getByLabelText('Industry')).toBeInTheDocument();
    expect(screen.getByLabelText('Company Size')).toBeInTheDocument();
  });

  it('renders Company Address heading and billing checkbox', () => {
    render(<CompanyDetailsSection {...defaultProps} />);
    expect(screen.getByText('Company Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Billing address is different from company address')).toBeInTheDocument();
  });

  it('renders billing address section when billingAddressDifferent is true', () => {
    render(<CompanyDetailsSection {...defaultProps} billingAddressDifferent />);
    expect(screen.getByText('Billing Address')).toBeInTheDocument();
  });

  describe('normalizeCountryValue', () => {
    it('returns empty string for falsy value', () => {
      expect(normalizeCountryValue('')).toBe('');
      expect(normalizeCountryValue(null)).toBe('');
      expect(normalizeCountryValue(undefined)).toBe('');
    });
    it('returns uppercase for 2-letter country code', () => {
      expect(normalizeCountryValue('us')).toBe('US');
      expect(normalizeCountryValue('US')).toBe('US');
      expect(normalizeCountryValue('gb')).toBe('GB');
    });
    it('returns value as-is for non-2-letter or non-alpha', () => {
      expect(normalizeCountryValue('USA')).toBe('USA');
      expect(normalizeCountryValue('United States')).toBe('United States');
    });
  });

  it('Website onBlur prepends https:// when value has no protocol', async () => {
    const onCompanyWebsiteChange = jest.fn();
    render(
      <CompanyDetailsSection
        {...defaultProps}
        companyWebsite=""
        onCompanyWebsiteChange={onCompanyWebsiteChange}
      />
    );
    const websiteInput = screen.getByLabelText('Website');
    await userEvent.type(websiteInput, 'example.com');
    fireEvent.blur(websiteInput, { target: { value: 'example.com' } });
    expect(onCompanyWebsiteChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'https://example.com' } }));
  });

  it('Website onBlur clears when value is empty', async () => {
    const onCompanyWebsiteChange = jest.fn();
    render(
      <CompanyDetailsSection
        {...defaultProps}
        companyWebsite="https://example.com"
        onCompanyWebsiteChange={onCompanyWebsiteChange}
      />
    );
    const websiteInput = screen.getByLabelText('Website');
    await userEvent.clear(websiteInput);
    fireEvent.blur(websiteInput, { target: { value: '' } });
    expect(onCompanyWebsiteChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: '' } }));
  });

  it('company address onSelect calls handlers and normalizes country', async () => {
    const onCompanyAddress1Change = jest.fn();
    const onCompanyAddress2Change = jest.fn();
    const onCompanyCityChange = jest.fn();
    const onCompanyStateChange = jest.fn();
    const onCompanyPostalCodeChange = jest.fn();
    const onCompanyCountryChange = jest.fn();
    render(
      <CompanyDetailsSection
        {...defaultProps}
        onCompanyAddress1Change={onCompanyAddress1Change}
        onCompanyAddress2Change={onCompanyAddress2Change}
        onCompanyCityChange={onCompanyCityChange}
        onCompanyStateChange={onCompanyStateChange}
        onCompanyPostalCodeChange={onCompanyPostalCodeChange}
        onCompanyCountryChange={onCompanyCountryChange}
      />
    );
    await userEvent.click(screen.getByText('Simulate select'));
    expect(onCompanyAddress1Change).toHaveBeenCalledWith(expect.objectContaining({ target: { value: '123 Main St' } }));
    expect(onCompanyAddress2Change).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'Suite 1' } }));
    expect(onCompanyCityChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'Philadelphia' } }));
    expect(onCompanyStateChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'PA' } }));
    expect(onCompanyPostalCodeChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: '19101' } }));
    expect(onCompanyCountryChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'US' } }));
  });

  it('billing checkbox triggers onBillingAddressDifferentChange', async () => {
    const onBillingAddressDifferentChange = jest.fn();
    render(
      <CompanyDetailsSection
        {...defaultProps}
        onBillingAddressDifferentChange={onBillingAddressDifferentChange}
      />
    );
    await userEvent.click(screen.getByLabelText('Billing address is different from company address'));
    expect(onBillingAddressDifferentChange).toHaveBeenCalled();
  });

  it('billing address section shows all fields when billingAddressDifferent', () => {
    const { container } = render(
      <CompanyDetailsSection
        {...defaultProps}
        billingAddressDifferent
        sortedCountries={[{ value: 'US', label: 'United States' }]}
        billingAvailableStates={[{ value: 'PA', label: 'Pennsylvania' }]}
      />
    );
    expect(screen.getByText('Billing Address')).toBeInTheDocument();
    expect(screen.getByTestId('address-billingAddress')).toBeInTheDocument();
    expect(container.querySelector('#billingAddress2')).toBeInTheDocument();
    expect(container.querySelector('#billingCity')).toBeInTheDocument();
    expect(container.querySelector('#billingPostalCode')).toBeInTheDocument();
  });

  it('billing address onSelect uses normalizeFn for country', async () => {
    const onBillingCountryChange = jest.fn();
    render(
      <CompanyDetailsSection
        {...defaultProps}
        billingAddressDifferent
        onBillingCountryChange={onBillingCountryChange}
      />
    );
    const billingAddressBlock = screen.getByTestId('address-billingAddress');
    await userEvent.click(within(billingAddressBlock).getByRole('button', { name: 'Simulate select' }));
    expect(onBillingCountryChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'US' } }));
  });
});
