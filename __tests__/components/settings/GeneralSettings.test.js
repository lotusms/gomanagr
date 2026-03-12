/**
 * Unit tests for GeneralSettings: loading, form render, submit
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GeneralSettings from '@/components/settings/GeneralSettings';

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'u1', email: 'u@example.com' } }),
}));

const mockGetUserAccount = jest.fn();
const mockCreateUserAccount = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  createUserAccount: (...args) => mockCreateUserAccount(...args),
}));

jest.mock('@/components/ui/Dropdown', () => function MockDropdown({ id, label, value, options }) {
  return (
    <div data-testid={`dropdown-${id}`}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={() => {}}>
        {(options || []).map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
});

jest.mock('@/components/ui/Toggle', () => function MockToggle({ id, label }) {
  return <div data-testid={`toggle-${id}`}>{label}</div>;
});

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, type, onClick }) => (
    <button type={type} onClick={onClick} data-testid="save-btn">{children}</button>
  ),
}));

describe('GeneralSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserAccount.mockResolvedValue({
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      numberFormat: '1,234.56',
      defaultLanguage: 'en',
      timeFormat: '24h',
      currency: 'USD',
      dataViewStyle: 'cards',
    });
    mockCreateUserAccount.mockResolvedValue(undefined);
  });

  it('shows loading then form with heading', async () => {
    render(<GeneralSettings />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General' })).toBeInTheDocument());
    expect(screen.getByText(/Manage your preferences/)).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-timezone')).toBeInTheDocument();
    expect(screen.getByTestId('save-btn')).toBeInTheDocument();
  });

  it('calls createUserAccount on save', async () => {
    render(<GeneralSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => expect(mockCreateUserAccount).toHaveBeenCalled());
    expect(mockCreateUserAccount).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        userId: 'u1',
        email: 'u@example.com',
        timezone: expect.any(String),
      }),
      null
    );
  });

  it('shows error when load fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetUserAccount.mockRejectedValueOnce(new Error('Load failed'));
    render(<GeneralSettings />);
    await waitFor(() => expect(screen.getByText(/Failed to load general settings/)).toBeInTheDocument());
    consoleSpy.mockRestore();
  });
});
