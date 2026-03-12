/**
 * Unit tests for ClientInternalNoteForm:
 * - Renders note content, tag dropdown, pin switch, Created by, actions
 * - Submit create/update, error, cancel, loading
 * - Created by label: You vs team member when editing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientInternalNoteForm from '@/components/clients/add-client/ClientInternalNoteForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {}, asPath: '/' }),
}));
jest.mock('@/components/ui', () => ({
  useCancelWithConfirm: (onCancel) => ({ handleCancel: onCancel, discardDialog: null }),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (term) => (term === 'teamMember' ? 'Team Member' : term === 'client' ? 'Client' : term),
}));

describe('ClientInternalNoteForm', () => {
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

  it('renders form fields and Add internal note button when no noteId', () => {
    render(<ClientInternalNoteForm {...defaultProps} />);
    expect(screen.getByLabelText(/note content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tag \/ category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pin note/i)).toBeInTheDocument();
    expect(screen.getByText('Created by')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add internal note$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('renders Update internal note button when noteId provided', () => {
    render(<ClientInternalNoteForm {...defaultProps} noteId="note-1" />);
    expect(screen.getByRole('button', { name: /^update internal note$/i })).toBeInTheDocument();
  });

  it('prefills initial content, tag, and pin', () => {
    render(
      <ClientInternalNoteForm
        {...defaultProps}
        initial={{
          content: 'Private note here',
          tag: 'reminder',
          is_pinned: true,
        }}
      />
    );
    expect(screen.getByDisplayValue('Private note here')).toBeInTheDocument();
    expect(screen.getByText('Reminder')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /pin note/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows Created by You when noteId and initial.user_id match userId', () => {
    render(
      <ClientInternalNoteForm
        {...defaultProps}
        noteId="note-1"
        initial={{ user_id: 'user-1' }}
      />
    );
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('shows Created by Team Member when noteId and initial.user_id differ from userId', () => {
    render(
      <ClientInternalNoteForm
        {...defaultProps}
        noteId="note-1"
        initial={{ user_id: 'other-user' }}
      />
    );
    expect(screen.getByText('Team Member')).toBeInTheDocument();
  });

  it('calls create-client-internal-note and onSuccess when creating', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'new-note' }) });
    render(<ClientInternalNoteForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/note content/i), 'New note text');
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/create-client-internal-note',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.clientId).toBe('client-1');
    expect(body.content).toBe('New note text');
    expect(body.is_pinned).toBe(false);
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('calls update-client-internal-note with noteId when updating', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(
      <ClientInternalNoteForm
        {...defaultProps}
        noteId="note-99"
        initial={{ content: 'Original' }}
      />
    );
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.noteId).toBe('note-99');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('shows error and does not call onSuccess when create fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    render(<ClientInternalNoteForm {...defaultProps} />);
    await userEvent.type(screen.getByLabelText(/note content/i), 'x');
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<ClientInternalNoteForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });
});
