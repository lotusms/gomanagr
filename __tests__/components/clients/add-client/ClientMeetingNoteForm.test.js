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

  it('prefills next_meeting_date from initial (toDateLocal)', () => {
    render(
      <ClientMeetingNoteForm
        {...defaultProps}
        initial={{ next_meeting_date: '2026-03-20T00:00:00.000Z' }}
      />
    );
    const dateInput = screen.getByLabelText(/next meeting date/i);
    expect(dateInput).toHaveValue();
    expect(dateInput.value).toMatch(/2026/);
  });

  it('parses initial attendees from comma-separated string', () => {
    render(
      <ClientMeetingNoteForm
        {...defaultProps}
        initial={{ attendees: 'a@b.com, b@c.com' }}
      />
    );
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
    expect(screen.getByText('b@c.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/attendee email/i)).toBeInTheDocument();
  });

  it('handles initial attendees empty string or non-string (parseAttendeesString)', () => {
    const { unmount } = render(
      <ClientMeetingNoteForm {...defaultProps} initial={{ attendees: '' }} />
    );
    expect(screen.getByLabelText(/attendees/i)).toBeInTheDocument();
    unmount();
    render(<ClientMeetingNoteForm {...defaultProps} initial={{ attendees: null }} />);
    expect(screen.getByLabelText(/attendees/i)).toBeInTheDocument();
  });

  it('shows attendeeError when invalid email is added (isValidEmail)', async () => {
    render(<ClientMeetingNoteForm {...defaultProps} />);
    const input = screen.getByPlaceholderText(/attendee email/i);
    await userEvent.type(input, 'not-an-email');
    fireEvent.click(screen.getByRole('button', { name: /add attendee/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/please enter a valid email address/i);
    });
  });

  it('shows error message when create API fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    render(<ClientMeetingNoteForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/meeting title/i), 'Kickoff');
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('shows error message when update API fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Update failed' }),
    });
    render(<ClientMeetingNoteForm {...defaultProps} noteId="n1" />);
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(screen.getByText('Update failed')).toBeInTheDocument());
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('includes location_zoom_link, notes, decisions_made, action_items in payload', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'new-note' }) });
    render(<ClientMeetingNoteForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/meeting title/i), 'Sync');
    await userEvent.type(screen.getByLabelText(/location \/ zoom link/i), 'https://zoom.us/j/1');
    await userEvent.type(screen.getByLabelText(/^notes$/i), 'Notes here');
    await userEvent.type(screen.getByLabelText(/decisions made/i), 'Decision 1');
    await userEvent.type(screen.getByLabelText(/action items/i), 'Action 1');
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.location_zoom_link).toBe('https://zoom.us/j/1');
    expect(body.notes).toBe('Notes here');
    expect(body.decisions_made).toBe('Decision 1');
    expect(body.action_items).toBe('Action 1');
  });
});
