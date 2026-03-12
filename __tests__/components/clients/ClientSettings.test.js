/**
 * Unit tests for ClientSettings
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientSettings from '@/components/clients/ClientSettings';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {}, asPath: '/' }),
}));

const mockGetUserAccount = jest.fn();
const mockCreateUserAccount = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  createUserAccount: (...args) => mockCreateUserAccount(...args),
}));

const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ success: mockSuccess, error: mockError }),
}));

const mockCurrentUser = { uid: 'user-1', email: 'u@test.com' };
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser: mockCurrentUser }),
}));

describe('ClientSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserAccount.mockResolvedValue({
      industry: 'Legal',
      defaultCurrency: 'USD',
      clientSettings: {
        defaultCurrency: 'USD',
        defaultStatus: 'active',
        defaultPreferredCommunication: 'email',
        visibleTabs: ['company', 'financial', 'projects', 'communication', 'documents', 'scheduling'],
      },
    });
  });

  it('shows loading spinner until settings load', () => {
    mockGetUserAccount.mockImplementation(() => new Promise(() => {}));
    render(<ClientSettings />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders form with defaults after load', async () => {
    render(<ClientSettings />);
    expect(await screen.findByText(/Client Defaults|client defaults/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Default Currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Default Status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
  });

  it('calls getUserAccount on mount when currentUser.uid exists', async () => {
    render(<ClientSettings />);
    await waitFor(() => expect(mockGetUserAccount).toHaveBeenCalledWith('user-1'));
  });

  it('saves settings on submit', async () => {
    mockGetUserAccount
      .mockResolvedValueOnce({
        industry: 'Legal',
        clientSettings: { visibleTabs: ['company', 'financial', 'projects', 'communication', 'documents', 'scheduling'] },
        teamMembers: [],
        clients: [],
        services: [],
        appointments: [],
      })
      .mockResolvedValueOnce({
        industry: 'Legal',
        clientSettings: {},
        teamMembers: [],
        clients: [],
        services: [],
        appointments: [],
      });
    mockCreateUserAccount.mockResolvedValue({});
    const { container } = render(<ClientSettings />);
    const saveBtn = await screen.findByRole('button', { name: /Save Settings/i });
    const form = container.querySelector('form');
    fireEvent.submit(form);
    await waitFor(() => expect(mockCreateUserAccount).toHaveBeenCalled());
    expect(mockSuccess).toHaveBeenCalledWith(expect.stringMatching(/settings saved/i));
  });

  it('shows error when load fails', async () => {
    mockGetUserAccount.mockRejectedValue(new Error('Network error'));
    const orig = console.error;
    console.error = () => {};
    render(<ClientSettings />);
    await waitFor(() => expect(mockError).toHaveBeenCalled());
    console.error = orig;
  });

  it('shows error when save fails', async () => {
    mockGetUserAccount
      .mockResolvedValueOnce({ industry: 'Legal', clientSettings: {}, teamMembers: [], clients: [], services: [], appointments: [] })
      .mockResolvedValueOnce({});
    mockCreateUserAccount.mockRejectedValue(new Error('Save failed'));
    const orig = console.error;
    console.error = () => {};
    const { container } = render(<ClientSettings />);
    await screen.findByRole('button', { name: /Save Settings/i });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mockError).toHaveBeenCalled());
    console.error = orig;
  });
});
