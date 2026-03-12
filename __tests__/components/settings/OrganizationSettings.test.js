/**
 * Unit tests for OrganizationSettings: loading, form render with company name and fields
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import OrganizationSettings from '@/components/settings/OrganizationSettings';

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'u1' } }),
}));

const mockGetUserAccount = jest.fn();
const mockGetUserOrganization = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  createUserAccount: jest.fn(() => Promise.resolve()),
  listStorageFiles: jest.fn(() => Promise.resolve([])),
  getStoragePublicUrl: jest.fn((path) => path),
  removeStorageFiles: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

jest.mock('react-icons/hi', () => ({
  HiCloudUpload: () => <span data-testid="icon-upload" />,
  HiX: () => <span data-testid="icon-x" />,
  HiPlus: () => <span data-testid="icon-plus" />,
}));

jest.mock('@/components/ui/Dropdown', () => function MockDropdown({ id, label }) {
  return <div data-testid={`dropdown-${id}`}>{label}</div>;
});

jest.mock('@/components/ui/InputField', () => function MockInputField({ id, label }) {
  return <div data-testid={`input-${id}`}>{label}</div>;
});

jest.mock('@/components/ui', () => ({
  AddressAutocomplete: () => <div data-testid="address-autocomplete" />,
  PhoneNumberInput: () => <div data-testid="phone-input" />,
}));

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children }) => <button type="submit" data-testid="save-btn">{children}</button>,
}));

jest.mock('@/utils/countries', () => ({ COUNTRIES: [{ code: 'US', name: 'United States' }] }));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  INDUSTRIES: [{ value: 'general', label: 'General' }],
}));

describe('OrganizationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserAccount.mockResolvedValue({ companyName: 'Acme', industry: 'general' });
    mockGetUserOrganization.mockResolvedValue(null);
    console.log = jest.fn();
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
});
