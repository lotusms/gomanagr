/**
 * Unit tests for ClientOnlineResourceForm:
 * - Renders resource name, URL, type, description, actions
 * - Submit create/update, error, cancel
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientOnlineResourceForm from '@/components/clients/add-client/ClientOnlineResourceForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {}, asPath: '/' }),
}));
jest.mock('@/components/ui', () => ({
  useCancelWithConfirm: (onCancel) => ({ handleCancel: onCancel, discardDialog: null }),
}));

describe('ClientOnlineResourceForm', () => {
  jest.setTimeout(30000);

  const defaultProps = {
    clientId: 'client-1',
    userId: 'user-1',
    organizationId: 'org-1',
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
  };

  let fetchMock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('renders form fields and Add resource button when no resourceId', () => {
    render(<ClientOnlineResourceForm {...defaultProps} />);
    expect(screen.getByLabelText(/resource name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^URL$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/resource type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add (online )?resource$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('renders Update resource button when resourceId provided', () => {
    render(<ClientOnlineResourceForm {...defaultProps} resourceId="res-1" />);
    expect(screen.getByRole('button', { name: /^update (online )?resource$/i })).toBeInTheDocument();
  });

  it('calls create-client-online-resource and onSuccess when creating', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'new-res' }) });
    render(<ClientOnlineResourceForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/resource name/i), 'Portal');
    await userEvent.type(screen.getByLabelText(/^URL$/i), 'https://example.com');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/create-client-online-resource',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.clientId).toBe('client-1');
    expect(body.resource_name).toBe('Portal');
    expect(body.url).toBe('https://example.com');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('calls update-client-online-resource with resourceId when updating', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(
      <ClientOnlineResourceForm
        {...defaultProps}
        resourceId="res-99"
        initial={{ resource_name: 'Old' }}
      />
    );
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.resourceId).toBe('res-99');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<ClientOnlineResourceForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('displays error when create API returns not ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) });
    render(<ClientOnlineResourceForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/resource name/i), 'Portal');
    await userEvent.type(screen.getByLabelText(/^URL$/i), 'https://example.com');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => {
      expect(screen.getByText(/Server error/)).toBeInTheDocument();
    });
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('displays error when update API returns not ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Update failed' }) });
    render(
      <ClientOnlineResourceForm {...defaultProps} resourceId="res-1" initial={{ resource_name: 'Old' }} />
    );
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => {
      expect(screen.getByText(/Update failed/)).toBeInTheDocument();
    });
  });

  it('displays generic error when API throws and response has no error message', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });
    render(<ClientOnlineResourceForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/resource name/i), 'X');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => {
      expect(screen.getByText(/Something went wrong|Failed to create/)).toBeInTheDocument();
    });
  });

  it('initializes form from initial with date_added, last_verified_date, has_admin_access', () => {
    render(
      <ClientOnlineResourceForm
        {...defaultProps}
        initial={{
          resource_name: 'Drive',
          url: 'https://drive.example.com',
          date_added: '2026-01-15T12:00:00.000Z',
          last_verified_date: '2026-02-01T12:00:00.000Z',
          has_admin_access: true,
          description: 'Desc',
          access_instructions: 'Steps',
          login_email_username: 'user',
          related_password: 'pass',
        }}
      />
    );
    expect(screen.getByLabelText(/resource name/i)).toHaveValue('Drive');
    expect(screen.getByLabelText(/^URL$/i)).toHaveValue('https://drive.example.com');
    const dateAddedInput = screen.getByLabelText(/date added/i);
    expect(dateAddedInput.value).toMatch(/2026-01-15|01\/15\/2026/);
    const lastVerifiedInput = screen.getByLabelText(/last verified/i);
    expect(lastVerifiedInput.value).toMatch(/2026-02-01|02\/0[12]\/2026/);
    expect(screen.getByLabelText(/description/i)).toHaveValue('Desc');
    expect(screen.getByLabelText(/access instructions/i)).toHaveValue('Steps');
    expect(screen.getByLabelText(/username/i)).toHaveValue('user');
    const adminSwitch = screen.getByRole('switch', { name: /do we have admin access/i });
    expect(adminSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onSuccess when provided and create succeeds', async () => {
    const onSuccess = jest.fn();
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'new' }) });
    render(<ClientOnlineResourceForm {...defaultProps} onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText(/resource name/i), 'R');
    await userEvent.type(screen.getByLabelText(/^URL$/i), 'https://x.com');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('submits with resource type, admin access, username, password, dates, description, access instructions', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'new' }) });
    render(<ClientOnlineResourceForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/resource name/i), 'Portal');
    await userEvent.type(screen.getByLabelText(/^URL$/i), 'https://example.com');
    const resourceTypeSelect = screen.getByLabelText(/resource type/i);
    if (resourceTypeSelect.tagName === 'SELECT') {
      fireEvent.change(resourceTypeSelect, { target: { value: 'google_drive_folder' } });
    }
    const adminSwitch = screen.getByRole('switch', { name: /do we have admin access/i });
    fireEvent.click(adminSwitch);
    await userEvent.type(screen.getByLabelText(/username/i), 'admin@co.com');
    const passwordInput = screen.getByLabelText(/^Related password$/i);
    fireEvent.change(passwordInput, { target: { value: 'secret' } });
    const dateAddedInput = screen.getByLabelText(/date added/i);
    fireEvent.change(dateAddedInput, { target: { value: '2026-01-15' } });
    const lastVerifiedInput = screen.getByLabelText(/last verified date/i);
    fireEvent.change(lastVerifiedInput, { target: { value: '2026-02-01' } });
    await userEvent.type(screen.getByLabelText(/description/i), 'Shared drive');
    await userEvent.type(screen.getByLabelText(/access instructions/i), 'Use SSO');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.resource_name).toBe('Portal');
    expect(body.url).toBe('https://example.com');
    expect(body.has_admin_access).toBe(true);
    expect(body.login_email_username).toBe('admin@co.com');
    expect(body.related_password).toBe('secret');
    expect(body.description).toBe('Shared drive');
    expect(body.access_instructions).toBe('Use SSO');
    if (resourceTypeSelect.tagName === 'SELECT') {
      expect(body.resource_type).toBe('google_drive_folder');
    }
  });

  it('shows Saving... and disables Cancel while submit in progress', async () => {
    let resolveFetch;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = () => resolve({ ok: true, json: () => Promise.resolve({ id: 'new' }) });
        })
    );
    render(<ClientOnlineResourceForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/resource name/i), 'X');
    await userEvent.type(screen.getByLabelText(/^URL$/i), 'https://x.com');
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
    resolveFetch();
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });
});
