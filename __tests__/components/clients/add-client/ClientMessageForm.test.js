/**
 * Unit tests for ClientMessageForm:
 * - Renders channel, direction, author, body, date, actions
 * - Submit create/update, error, cancel
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientMessageForm from '@/components/clients/add-client/ClientMessageForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {}, asPath: '/' }),
}));
jest.mock('@/components/ui', () => ({
  useCancelWithConfirm: (onCancel) => ({ handleCancel: onCancel, discardDialog: null }),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (term) => (term === 'teamMember' ? 'Team Member' : term),
}));

describe('ClientMessageForm', () => {
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

  it('renders form fields and Add message button when no messageId', () => {
    render(<ClientMessageForm {...defaultProps} />);
    expect(screen.getByText(/channel/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /sms/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /sent/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Author$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Message content/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add message$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('renders Update message button when messageId provided', () => {
    render(<ClientMessageForm {...defaultProps} messageId="msg-1" />);
    expect(screen.getByRole('button', { name: /^update message$/i })).toBeInTheDocument();
  });

  it('calls create-client-message and onSuccess when creating', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'new-msg' }) });
    render(<ClientMessageForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/^Author$/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/Message content/i), 'Hello');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/create-client-message',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.clientId).toBe('client-1');
    expect(body.author).toBe('Jane');
    expect(body.body).toBe('Hello');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('calls update-client-message with messageId when updating', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(
      <ClientMessageForm
        {...defaultProps}
        messageId="msg-99"
        initial={{ body: 'Original' }}
      />
    );
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messageId).toBe('msg-99');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('shows error when create fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    render(<ClientMessageForm {...defaultProps} />);
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<ClientMessageForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });
});
