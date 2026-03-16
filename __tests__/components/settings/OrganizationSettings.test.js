/**
 * Unit tests for OrganizationSettings: loading, form render, load data, input change, add/remove location, logo, submit
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import OrganizationSettings from '@/components/settings/OrganizationSettings';

const stableCurrentUser = { uid: 'u1', email: 'u@test.com' };
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser: stableCurrentUser }),
}));

const mockGetUserAccount = jest.fn();
const mockCreateUserAccount = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  createUserAccount: (...args) => mockCreateUserAccount(...args),
  listStorageFiles: jest.fn(() => Promise.resolve([])),
  getStoragePublicUrl: jest.fn((path) => path),
  removeStorageFiles: jest.fn(() => Promise.resolve()),
}));

const mockGetUserOrganization = jest.fn();
jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

jest.mock('react-icons/hi', () => ({
  HiCloudUpload: () => <span data-testid="icon-upload" />,
  HiX: () => <span data-testid="icon-x" />,
  HiPlus: () => <span data-testid="icon-plus" />,
}));

jest.mock('@/components/ui/Dropdown', () => function MockDropdown({ id, label, name, onChange, value, options = [] }) {
  const opts = Array.isArray(options) ? options : [];
  return (
    <div data-testid={`dropdown-${id}`}>
      <span>{label}</span>
      <select
        data-testid={`select-${id}`}
        name={name}
        value={value || ''}
        onChange={(e) => onChange && onChange(e)}
      >
        <option value="">--</option>
        {opts.map((o) => (
          <option key={String(o.value)} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
});

jest.mock('@/components/ui/InputField', () => function MockInputField({ id, label, onChange, value, inputProps }) {
  return (
    <div data-testid={`input-wrap-${id}`}>
      <span>{label}</span>
      <input
        data-testid={`input-${id}`}
        name={inputProps?.name || id}
        value={value || ''}
        onChange={(e) => onChange && onChange(e)}
      />
    </div>
  );
});

jest.mock('@/components/ui', () => ({
  AddressAutocomplete: function MockAddressAutocomplete({ id, onSelect, onChange, value, label }) {
    const isNewLocation = id === 'newLocation';
    return (
      <div data-testid={isNewLocation ? 'address-new-location' : 'address-autocomplete'}>
        <span>{label}</span>
        {isNewLocation && onChange != null && (
          <input
            data-testid="new-location-input"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Start typing an address..."
          />
        )}
        {onSelect && (
          <button
            type="button"
            data-testid={isNewLocation ? 'address-add-location-btn' : 'address-hq-select-btn'}
            onClick={() => onSelect({
              address1: '123 Main St',
              address2: 'Suite 1',
              city: 'Lancaster',
              state: 'PA',
              postalCode: '17601',
              country: 'US',
            })}
          >
            Select address
          </button>
        )}
      </div>
    );
  },
  PhoneNumberInput: () => <div data-testid="phone-input" />,
}));

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children }) => <button type="submit" data-testid="save-btn">{children}</button>,
}));

jest.mock('@/utils/countries', () => ({ COUNTRIES: [{ value: 'US', label: 'United States' }] }));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  INDUSTRIES: ['general', 'healthcare'],
}));

describe('OrganizationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserAccount.mockResolvedValue({ companyName: 'Acme', industry: 'general' });
    mockGetUserOrganization.mockResolvedValue(null);
    mockCreateUserAccount.mockResolvedValue({});
    global.fetch = jest.fn();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  it('shows loading then form with heading', async () => {
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Organization' })).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByTestId('dropdown-industry')).toBeInTheDocument();
  });

  it('loads user and org data', async () => {
    mockGetUserOrganization.mockResolvedValueOnce({ name: 'Org Inc', industry: 'healthcare' });
    render(<OrganizationSettings />);
    await waitFor(() => expect(mockGetUserAccount).toHaveBeenCalledWith('u1'));
    expect(mockGetUserOrganization).toHaveBeenCalledWith('u1');
  });

  it('shows loading spinner when currentUser exists and data is loading', async () => {
    let resolveUser;
    let resolveOrg;
    mockGetUserAccount.mockReturnValue(new Promise((r) => { resolveUser = r; }));
    mockGetUserOrganization.mockReturnValue(new Promise((r) => { resolveOrg = r; }));
    render(<OrganizationSettings />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    resolveUser({ companyName: 'Acme' });
    resolveOrg(null);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Organization' })).toBeInTheDocument());
  });

  it('loads org with logo, alt logo, and locations and merges them', async () => {
    mockGetUserAccount.mockResolvedValueOnce({
      companyName: 'User Co',
      organizationAddress: '456 User St',
      organizationCity: 'York',
      organizationState: 'PA',
      organizationCountry: 'US',
    });
    mockGetUserOrganization.mockResolvedValueOnce({
      id: 'org1',
      name: 'Org Inc',
      logo_url: 'https://example.com/logo.png',
      alt_logo_url: 'https://example.com/alt.png',
      address_line_1: '123 Main St',
      city: 'Lancaster',
      state: 'PA',
      country: 'US',
      locations: [
        { address: '123 Main St', city: 'Lancaster', state: 'PA', postalCode: '17601', country: 'US' },
        '999 Other St',
      ],
    });
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Organization' })).toBeInTheDocument());
    expect(screen.getByAltText('Organization logo')).toBeInTheDocument();
    expect(screen.getByAltText('Organization alt logo')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
  });

  it('updates form when company name input changes', async () => {
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByTestId('input-companyName')).toBeInTheDocument());
    const nameInput = screen.getByTestId('input-companyName');
    fireEvent.change(nameInput, { target: { name: 'companyName', value: 'New Name' } });
    await waitFor(() => expect(nameInput).toHaveValue('New Name'));
  });

  it('adds location when Add Location onSelect is triggered', async () => {
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Organization' })).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText('Locations')).toBeInTheDocument();
    const addLocationBtn = screen.getByTestId('address-add-location-btn');
    fireEvent.click(addLocationBtn);
    await waitFor(() => expect(screen.getByText('123 Main St')).toBeInTheDocument(), { timeout: 1500 });
  });

  it('removes non-HQ location when remove is clicked', async () => {
    mockGetUserOrganization.mockResolvedValueOnce({
      id: 'org1',
      name: 'Org',
      address_line_1: '123 Main St',
      locations: [
        { address: '123 Main St', city: 'Lancaster' },
        { address: '456 Other St', city: 'York' },
      ],
    });
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByText('456 Other St')).toBeInTheDocument());
    const removeButtons = screen.getAllByTitle('Remove location');
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(removeButtons[0]);
    await waitFor(() => expect(screen.queryByText('456 Other St')).not.toBeInTheDocument());
  });

  it('shows error when logo file exceeds 5MB', async () => {
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Organization' })).toBeInTheDocument());
    const fileInput = document.getElementById('logo');
    if (fileInput) {
      const bigFile = new File(['x'], 'big.png', { type: 'image/png' });
      Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 });
      fireEvent.change(fileInput, { target: { files: [bigFile] } });
      await waitFor(() => expect(screen.getByText(/Logo file size must be less than 5MB/)).toBeInTheDocument());
    }
  });

  it('calls removeLogo and clears logo when Remove logo is clicked', async () => {
    mockGetUserOrganization
      .mockResolvedValueOnce({ id: 'org1', name: 'Org', logo_url: 'https://example.com/logo.png' })
      .mockResolvedValue({ id: 'org1', name: 'Org' });
    mockGetUserAccount.mockResolvedValue({ companyName: 'Org', companyLogo: 'https://example.com/logo.png' });
    global.fetch.mockResolvedValue({ ok: true });
    mockCreateUserAccount.mockResolvedValue({ companyLogo: '' });
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByAltText('Organization logo')).toBeInTheDocument());
    const removeBtn = screen.getByTitle('Remove logo');
    fireEvent.click(removeBtn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/update-organization', expect.any(Object)));
    await waitFor(() => expect(mockCreateUserAccount).toHaveBeenCalled());
  });

  it('calls removeAltLogo when Remove alt logo is clicked', async () => {
    mockGetUserOrganization
      .mockResolvedValueOnce({ id: 'org1', name: 'Org', alt_logo_url: 'https://example.com/alt.png' })
      .mockResolvedValue({ id: 'org1', name: 'Org' });
    global.fetch.mockResolvedValue({ ok: true });
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByAltText('Organization alt logo')).toBeInTheDocument());
    const removeBtn = screen.getByTitle('Remove alt logo');
    fireEvent.click(removeBtn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/update-organization', expect.any(Object)));
  });

  it('submits form and calls update-organization and createUserAccount', async () => {
    mockGetUserOrganization.mockResolvedValue({ id: 'org1', name: 'Org' });
    mockGetUserAccount.mockResolvedValue({ companyName: 'Org', userId: 'u1', email: 'u@test.com' });
    global.fetch.mockResolvedValue({ ok: true });
    mockCreateUserAccount.mockResolvedValue({});
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/update-organization', expect.any(Object)));
    await waitFor(() => expect(mockCreateUserAccount).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/Organization settings saved successfully/)).toBeInTheDocument());
  });

  it('shows error when update-organization fails', async () => {
    mockGetUserOrganization.mockResolvedValue({ id: 'org1', name: 'Org' });
    global.fetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Forbidden' }) });
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => expect(screen.getByText(/Forbidden|Failed to update/)).toBeInTheDocument());
  });

  it('shows error when remove logo fails', async () => {
    mockGetUserOrganization.mockResolvedValue({ id: 'org1', name: 'Org', logo_url: 'https://example.com/logo.png' });
    mockGetUserAccount.mockResolvedValue({ companyName: 'Org', companyLogo: 'https://example.com/logo.png' });
    global.fetch.mockRejectedValue(new Error('Network error'));
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByAltText('Organization logo')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Remove logo'));
    await waitFor(() => expect(screen.getByText(/Failed to remove logo/)).toBeInTheDocument());
  });

  it('shows error when submit and organization not found', async () => {
    mockGetUserOrganization.mockResolvedValue(null);
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => expect(screen.getByText(/Organization not found|contact support/)).toBeInTheDocument());
  });

  it('HQ address onSelect shows Address line 2 and City/State/Postal fields', async () => {
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByTestId('address-hq-select-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('address-hq-select-btn'));
    await waitFor(() => expect(screen.getByTestId('input-organizationAddress2')).toBeInTheDocument());
    expect(screen.getByTestId('input-organizationCity')).toBeInTheDocument();
    expect(screen.getByTestId('input-organizationState')).toBeInTheDocument();
    expect(screen.getByTestId('input-organizationPostalCode')).toBeInTheDocument();
  });

  it('newLocation AddressAutocomplete onChange updates value', async () => {
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByTestId('new-location-input')).toBeInTheDocument());
    const input = screen.getByTestId('new-location-input');
    fireEvent.change(input, { target: { value: '456 Oak Ave' } });
    await waitFor(() => expect(input).toHaveValue('456 Oak Ave'));
  });

  it('submit with logo file uploads logo and then updates org', async () => {
    mockGetUserOrganization.mockResolvedValue({ id: 'org1', name: 'Org' });
    mockGetUserAccount.mockResolvedValue({ companyName: 'Org', userId: 'u1', email: 'u@test.com' });
    const smallFile = new File(['x'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(smallFile, 'size', { value: 1024 });
    global.FileReader = jest.fn().mockImplementation(function () {
      this.readAsDataURL = jest.fn(() => {
        setTimeout(() => {
          this.onloadend && this.onloadend({ target: { result: 'data:image/png;base64,x' } });
        }, 0);
      });
      this.result = 'data:image/png;base64,x';
    });
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ logoUrl: 'https://uploaded.com/logo.png' }) })
      .mockResolvedValueOnce({ ok: true });
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    const logoInput = document.getElementById('logo');
    expect(logoInput).toBeTruthy();
    fireEvent.change(logoInput, { target: { files: [smallFile] } });
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/upload-organization-logo', expect.any(Object)));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/update-organization', expect.any(Object)));
    await waitFor(() => expect(screen.getByText(/Organization settings saved successfully/)).toBeInTheDocument());
  });

  it('shows error when logo upload fails during submit', async () => {
    mockGetUserOrganization.mockResolvedValue({ id: 'org1', name: 'Org' });
    mockGetUserAccount.mockResolvedValue({});
    const smallFile = new File(['x'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(smallFile, 'size', { value: 1024 });
    global.FileReader = jest.fn().mockImplementation(function () {
      this.readAsDataURL = jest.fn(() => {
        setTimeout(() => { this.onloadend && this.onloadend({ target: { result: 'data:image/png;base64,x' } }); }, 0);
      });
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    const logoInput = document.getElementById('logo');
    fireEvent.change(logoInput, { target: { files: [smallFile] } });
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => expect(screen.getByText(/Failed to upload logo/)).toBeInTheDocument());
  });

  it('submit with alt logo file uploads alt logo', async () => {
    mockGetUserOrganization.mockResolvedValue({ id: 'org1', name: 'Org' });
    mockGetUserAccount.mockResolvedValue({ companyName: 'Org', userId: 'u1', email: 'u@test.com' });
    const smallFile = new File(['y'], 'alt.png', { type: 'image/png' });
    Object.defineProperty(smallFile, 'size', { value: 1024 });
    global.FileReader = jest.fn().mockImplementation(function () {
      this.readAsDataURL = jest.fn(() => {
        setTimeout(() => { this.onloadend && this.onloadend({ target: { result: 'data:image/png;base64,y' } }); }, 0);
      });
    });
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ altLogoUrl: 'https://uploaded.com/alt.png' }) })
      .mockResolvedValueOnce({ ok: true });
    render(<OrganizationSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    const altInput = document.getElementById('alt-logo');
    if (altInput) {
      fireEvent.change(altInput, { target: { files: [smallFile] } });
      fireEvent.click(screen.getByTestId('save-btn'));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/upload-organization-logo', expect.objectContaining({
        body: expect.stringContaining('isAltLogo'),
      })));
    }
  });
});
