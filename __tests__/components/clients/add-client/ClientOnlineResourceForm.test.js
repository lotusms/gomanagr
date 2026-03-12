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
});
