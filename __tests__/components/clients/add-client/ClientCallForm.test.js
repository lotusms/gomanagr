/**
 * Unit tests for ClientCallForm:
 * - Renders direction, phone, duration, date/time, summary, follow-up, actions
 * - Submit create: POST create-client-call, onSuccess
 * - Submit update: POST update-client-call with callId, onSuccess
 * - Error display, cancel, loading state
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientCallForm from '@/components/clients/add-client/ClientCallForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {}, asPath: '/' }),
}));
jest.mock('@/components/ui', () => ({
  useCancelWithConfirm: (onCancel) => ({ handleCancel: onCancel, discardDialog: null }),
}));

describe('ClientCallForm', () => {
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

  it('renders form fields and Add call button when no callId', () => {
    render(<ClientCallForm {...defaultProps} />);
    expect(screen.getByText('Call direction')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /incoming/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /outgoing/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^duration$/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Date / time')).toBeInTheDocument();
    expect(screen.getByLabelText(/call summary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/follow-up date \/ time/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add call$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('renders Update call button when callId provided', () => {
    render(<ClientCallForm {...defaultProps} callId="call-1" />);
    expect(screen.getByRole('button', { name: /^update call$/i })).toBeInTheDocument();
  });

  it('prefills initial values when initial prop provided', () => {
    render(
      <ClientCallForm
        {...defaultProps}
        initial={{
          direction: 'incoming',
          phone_number: '+15551234567',
          duration: '5 min',
          summary: 'Discussed scope',
          called_at: '2026-03-01T14:30:00Z',
          follow_up_at: '2026-03-05T10:00:00Z',
        }}
      />
    );
    expect(screen.getByRole('radio', { name: /incoming/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Discussed scope')).toBeInTheDocument();
  });

  it('calls create-client-call with payload and onSuccess when creating', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'new-call' }) });
    render(<ClientCallForm {...defaultProps} />);

    await userEvent.type(screen.getByLabelText(/phone number/i), '7175551234');
    await userEvent.type(screen.getByLabelText(/call summary/i), 'Follow up next week');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/create-client-call',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.clientId).toBe('client-1');
    expect(body.userId).toBe('user-1');
    expect(body.direction).toBe('outgoing');
    expect(body.summary).toBe('Follow up next week');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('calls update-client-call with callId when updating', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(
      <ClientCallForm
        {...defaultProps}
        callId="call-99"
        initial={{ direction: 'incoming', summary: 'Original' }}
      />
    );

    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/update-client-call',
      expect.objectContaining({
        method: 'POST',
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.callId).toBe('call-99');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('shows error and does not call onSuccess when create fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Validation failed' }),
    });
    render(<ClientCallForm {...defaultProps} />);
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => expect(screen.getByText('Validation failed')).toBeInTheDocument());
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<ClientCallForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('disables buttons and shows Saving when submitting', async () => {
    let resolveCreate;
    fetchMock.mockImplementation(
      () =>
        new Promise((r) => {
          resolveCreate = r;
        })
    );
    render(<ClientCallForm {...defaultProps} />);
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    resolveCreate({ ok: true, json: () => Promise.resolve({}) });
  });
});
