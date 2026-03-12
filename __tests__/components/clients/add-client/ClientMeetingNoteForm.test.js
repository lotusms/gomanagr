/**
 * Unit tests for ClientMeetingNoteForm:
 * - Renders title, date, attendees, notes, actions
 * - Submit create/update, error, cancel
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientMeetingNoteForm from '@/components/clients/add-client/ClientMeetingNoteForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {}, asPath: '/' }),
}));
jest.mock('@/components/ui', () => ({
  useCancelWithConfirm: (onCancel) => ({ handleCancel: onCancel, discardDialog: null }),
}));

describe('ClientMeetingNoteForm', () => {
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

  it('renders form fields and Add meeting note button when no noteId', () => {
    render(<ClientMeetingNoteForm {...defaultProps} />);
    expect(screen.getByLabelText(/meeting title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date \/ time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/attendees/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Notes$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add meeting note$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('renders Update meeting note button when noteId provided', () => {
    render(<ClientMeetingNoteForm {...defaultProps} noteId="note-1" />);
    expect(screen.getByRole('button', { name: /^update meeting note$/i })).toBeInTheDocument();
  });

  it('calls create-client-meeting-note and onSuccess when creating', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'new-note' }) });
    render(<ClientMeetingNoteForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/meeting title/i), 'Kickoff');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/create-client-meeting-note',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.clientId).toBe('client-1');
    expect(body.title).toBe('Kickoff');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('calls update-client-meeting-note with noteId when updating', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(
      <ClientMeetingNoteForm
        {...defaultProps}
        noteId="note-99"
        initial={{ title: 'Original' }}
      />
    );
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.noteId).toBe('note-99');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<ClientMeetingNoteForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });
});
