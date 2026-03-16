/**
 * Unit tests for CommunicationLogSection:
 * - Exports LOG_TYPES
 * - Renders side nav with section labels and intro text
 * - With clientId/userId, fetches emails and shows empty state (mocked fetch)
 * - EmailsBlock: loading, empty with Add email, with data, delete flow, fetch error
 * - Legacy LogBlock for emails/messages; handleAddInHeader; nav count; initialSection
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommunicationLogSection, { LOG_TYPES } from '@/components/clients/add-client/CommunicationLogSection';

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'client' ? 'Client' : t),
}));

describe('CommunicationLogSection', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('exports LOG_TYPES with expected keys', () => {
    expect(LOG_TYPES.map((t) => t.key)).toEqual([
      'emails',
      'messages',
      'calls',
      'meetingNotes',
      'internalNotes',
    ]);
  });

  it('renders intro text and nav labels when no clientId (legacy mode)', () => {
    render(
      <CommunicationLogSection
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    expect(screen.getByText(/Keep a record of how you've communicated/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Communication log sections' })).toBeInTheDocument();
    expect(screen.getAllByText('Emails').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getAllByText('Internal notes').length).toBeGreaterThanOrEqual(1);
  });

  it('with clientId and userId shows emails block and empty state after fetch', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ emails: [] }),
    });
    render(
      <CommunicationLogSection
        clientId="client-1"
        userId="user-1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/No emails yet|Loading emails/)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/No emails yet/)).toBeInTheDocument();
    });
    globalThis.fetch = origFetch;
  });

  it('shows InternalNotesView when initialSection is internalNotes and not using API', () => {
    render(
      <CommunicationLogSection
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        internalNotes=""
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
        onInternalNotesChange={() => {}}
        initialSection="internalNotes"
      />
    );
    expect(screen.getByText(/Private—not visible to client/)).toBeInTheDocument();
  });

  it('EmailsBlock: fetch error sets emails to empty and shows empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    render(
      <CommunicationLogSection
        clientId="client-1"
        userId="user-1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/No emails yet/)).toBeInTheDocument();
    });
    globalThis.fetch = origFetch;
  });

  it('EmailsBlock: empty state Add email button pushes to new email URL', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ emails: [] }) });
    render(
      <CommunicationLogSection
        clientId="client-1"
        userId="user-1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/No emails yet/)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /Add email/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/client-1/emails/new');
    globalThis.fetch = origFetch;
  });

  it('EmailsBlock: with emails from API shows cards and delete confirm removes item', async () => {
    const emails = [
      { id: 'e1', direction: 'sent', sent_at: '2026-02-27T14:00:00Z', subject: 'Test Subj', body: 'Body', attachments: [] },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url, opts) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails }) });
      if (url?.includes?.('delete-client-email'))
        return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="client-1"
        userId="user-1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => {
      expect(screen.getByText('Test Subj')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByTitle('Delete email'));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => {
      expect(screen.getByText(/No emails yet/)).toBeInTheDocument();
    });
    globalThis.fetch = origFetch;
  });

  it('legacy mode: emails as legacyEmails shows LogBlock with entry and Add calls onEmailsChange', async () => {
    const onEmailsChange = jest.fn();
    render(
      <CommunicationLogSection
        emails={['first note']}
        onEmailsChange={onEmailsChange}
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('first note')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(onEmailsChange).toHaveBeenCalledWith(['first note', '']);
  });

  it('legacy mode: messages tab shows LogBlock with messages entry', async () => {
    render(
      <CommunicationLogSection
        messages={['msg one']}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('Messages'));
    expect(screen.getByDisplayValue('msg one')).toBeInTheDocument();
  });

  it('legacy mode: Add button for messages section calls onMessagesChange', async () => {
    const onMessagesChange = jest.fn();
    render(
      <CommunicationLogSection
        messages={['m1']}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={onMessagesChange}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('Messages'));
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(onMessagesChange).toHaveBeenCalledWith(['m1', '']);
  });

  it('with clientId and API: Add button in header pushes to emails new', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ emails: [{ id: 'e1', subject: 'X', body: '', direction: 'sent', sent_at: '2026-01-01T00:00:00Z', attachments: [] }] }) });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => {
      expect(screen.getByText('X')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/emails/new');
    globalThis.fetch = origFetch;
  });

  it('respects initialSection and shows correct viewer', () => {
    render(
      <CommunicationLogSection
        initialSection="calls"
        messages={[]}
        calls={['call note']}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('call note')).toBeInTheDocument();
  });

  it('legacy LogBlock empty state shows No entries yet and Add button', () => {
    render(
      <CommunicationLogSection
        emails={[]}
        onEmailsChange={() => {}}
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    expect(screen.getByText('No entries yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Add$/i })).toBeInTheDocument();
  });

  it('EmailsBlock: delete API failure resets emailToDelete and keeps list', async () => {
    const emails = [
      { id: 'e1', direction: 'sent', sent_at: '2026-02-27T14:00:00Z', subject: 'Subj', body: 'B', attachments: [] },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails }) });
      if (url?.includes?.('delete-client-email'))
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Forbidden' }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText('Subj')).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('Delete email'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Subj')).toBeInTheDocument();
    globalThis.fetch = origFetch;
  });

  it('EmailsBlock: delete fetch throw resets emailToDelete', async () => {
    const emails = [
      { id: 'e1', direction: 'sent', sent_at: '2026-02-27T14:00:00Z', subject: 'Subj', body: 'B', attachments: [] },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails }) });
      if (url?.includes?.('delete-client-email'))
        return Promise.reject(new Error('Network error'));
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText('Subj')).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('Delete email'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Subj')).toBeInTheDocument();
    globalThis.fetch = origFetch;
  });

  it('MessagesBlock with clientId fetches and shows empty state when API returns []', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-messages'))
        return Promise.resolve({ ok: true, json: async () => ({ messages: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Messages'));
    await waitFor(() => {
      expect(screen.getByText(/No messages yet|Loading messages/)).toBeInTheDocument();
    });
    await waitFor(() => expect(screen.getByText(/No messages yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('CallsBlock with clientId fetches and shows empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-calls'))
        return Promise.resolve({ ok: true, json: async () => ({ calls: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Calls'));
    await waitFor(() => expect(screen.getByText(/No calls yet|Loading calls/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/No calls yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('MeetingNotesBlock with clientId fetches and shows empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-meeting-notes'))
        return Promise.resolve({ ok: true, json: async () => ({ notes: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Meeting notes'));
    await waitFor(() => expect(screen.getByText(/No meeting notes yet|Loading meeting notes/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('No meeting notes yet')).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('InternalNotesBlock with clientId fetches and shows content', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-internal-notes'))
        return Promise.resolve({ ok: true, json: async () => ({ notes: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        internalNotes=""
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
        onInternalNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Internal notes'));
    await waitFor(() => expect(screen.getByText(/No internal notes yet|Loading internal notes/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('No internal notes yet')).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('initialSection change via rerender updates selected viewer', () => {
    const { rerender } = render(
      <CommunicationLogSection
        initialSection="emails"
        emails={[]}
        onEmailsChange={() => {}}
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    expect(screen.getByText('No entries yet')).toBeInTheDocument();
    rerender(
      <CommunicationLogSection
        initialSection="meetingNotes"
        emails={[]}
        onEmailsChange={() => {}}
        messages={[]}
        calls={[]}
        meetingNotes={['note one']}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('note one')).toBeInTheDocument();
  });

  it('legacy mode: meeting notes tab shows LogBlock with entry', async () => {
    render(
      <CommunicationLogSection
        messages={[]}
        calls={[]}
        meetingNotes={['meeting note one']}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('Meeting notes'));
    expect(screen.getByDisplayValue('meeting note one')).toBeInTheDocument();
  });

  it('legacy mode: nav shows message count when messages provided', () => {
    render(
      <CommunicationLogSection
        messages={['a', 'b']}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    const nav = screen.getByRole('navigation', { name: 'Communication log sections' });
    const messagesBtn = within(nav).getByText('Messages').closest('button');
    expect(messagesBtn).toHaveTextContent('2');
  });

  it('MessagesBlock with data shows cards and Add message button navigates to new', async () => {
    const messages = [
      { id: 'm1', direction: 'outbound', body: 'Msg body', created_at: '2026-02-27T14:00:00Z' },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-messages'))
        return Promise.resolve({ ok: true, json: async () => ({ messages }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Messages'));
    await waitFor(() => expect(screen.getByText('Msg body')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Add/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/messages/new');
    globalThis.fetch = origFetch;
  });

  it('CallsBlock with data shows cards and Add call button navigates to new', async () => {
    const calls = [
      { id: 'call1', summary: 'Call summary', call_date: '2026-02-27', duration_minutes: 5 },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-calls'))
        return Promise.resolve({ ok: true, json: async () => ({ calls }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Calls'));
    await waitFor(() => expect(screen.getByText(/Call summary/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Add/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/calls/new');
    globalThis.fetch = origFetch;
  });

  it('MeetingNotesBlock with data shows cards and Add meeting note button navigates', async () => {
    const notes = [
      { id: 'n1', title: 'Kickoff', content: 'Notes content', meeting_date: '2026-02-27' },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-meeting-notes'))
        return Promise.resolve({ ok: true, json: async () => ({ notes }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Meeting notes'));
    await waitFor(() => expect(screen.getByText(/Kickoff|Notes content/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Add/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/meeting-notes/new');
    globalThis.fetch = origFetch;
  });

  it('InternalNotesBlock with data shows cards and Add internal note button navigates', async () => {
    const notes = [
      { id: 'in1', content: 'Internal note content', created_at: '2026-02-27T14:00:00Z' },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-internal-notes'))
        return Promise.resolve({ ok: true, json: async () => ({ notes }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        internalNotes=""
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
        onInternalNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Internal notes'));
    await waitFor(() => expect(screen.getByText(/Internal note content/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Add/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/internal-notes/new');
    globalThis.fetch = origFetch;
  });

  it('legacy mode: LogBlock with calls items renders entries and onRemove removes item', async () => {
    const onCallsChange = jest.fn();
    render(
      <CommunicationLogSection
        messages={[]}
        calls={['call one', 'call two']}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={onCallsChange}
        onMeetingNotesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('Calls'));
    expect(screen.getByDisplayValue('call one')).toBeInTheDocument();
    expect(screen.getByDisplayValue('call two')).toBeInTheDocument();
    const removeButtons = screen.getAllByTitle('Remove entry');
    await userEvent.click(removeButtons[0]);
    expect(onCallsChange).toHaveBeenCalledWith(['call two']);
  });

  it('legacy mode: LogBlock with meeting notes onEdit updates entry', async () => {
    const onMeetingNotesChange = jest.fn();
    render(
      <CommunicationLogSection
        messages={[]}
        calls={[]}
        meetingNotes={['note one']}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={onMeetingNotesChange}
      />
    );
    await userEvent.click(screen.getByText('Meeting notes'));
    const input = screen.getByDisplayValue('note one');
    await userEvent.type(input, 'x');
    expect(onMeetingNotesChange).toHaveBeenCalled();
    const lastCall = onMeetingNotesChange.mock.calls[onMeetingNotesChange.mock.calls.length - 1][0];
    expect(lastCall[0]).toBe('note onex');
  });

  it('MeetingNotesBlock with data: delete confirm removes note', async () => {
    const notes = [
      { id: 'mn1', title: 'Kickoff', content: 'Content', meeting_date: '2026-02-27' },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-meeting-notes'))
        return Promise.resolve({ ok: true, json: async () => ({ notes }) });
      if (url?.includes?.('delete-client-meeting-note'))
        return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Meeting notes'));
    await waitFor(() => expect(screen.getByText(/Kickoff|Content/)).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('Delete meeting note'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.getByText('No meeting notes yet')).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('InternalNotesBlock with data: delete confirm removes note', async () => {
    const notes = [
      { id: 'in1', content: 'Secret note', created_at: '2026-02-27T14:00:00Z' },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-internal-notes'))
        return Promise.resolve({ ok: true, json: async () => ({ notes }) });
      if (url?.includes?.('delete-client-internal-note'))
        return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        internalNotes=""
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
        onInternalNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Internal notes'));
    await waitFor(() => expect(screen.getByText(/Secret note/)).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('Delete internal note'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.getByText('No internal notes yet')).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('MeetingNotesBlock: delete API failure keeps list and closes dialog', async () => {
    const notes = [
      { id: 'mn1', title: 'Note', content: 'C', meeting_date: '2026-02-27' },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-meeting-notes'))
        return Promise.resolve({ ok: true, json: async () => ({ notes }) });
      if (url?.includes?.('delete-client-meeting-note'))
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Forbidden' }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Meeting notes'));
    await waitFor(() => expect(screen.getByTitle('Delete meeting note')).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('Delete meeting note'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTitle('Delete meeting note')).toBeInTheDocument();
    globalThis.fetch = origFetch;
  });

  it('InternalNotesBlock: delete API failure keeps list and closes dialog', async () => {
    const notes = [
      { id: 'in1', content: 'Internal', created_at: '2026-02-27T14:00:00Z' },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-emails'))
        return Promise.resolve({ ok: true, json: async () => ({ emails: [] }) });
      if (url?.includes?.('get-client-internal-notes'))
        return Promise.resolve({ ok: true, json: async () => ({ notes }) });
      if (url?.includes?.('delete-client-internal-note'))
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Forbidden' }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <CommunicationLogSection
        clientId="c1"
        userId="u1"
        messages={[]}
        calls={[]}
        meetingNotes={[]}
        internalNotes=""
        onMessagesChange={() => {}}
        onCallsChange={() => {}}
        onMeetingNotesChange={() => {}}
        onInternalNotesChange={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/No emails yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Internal notes'));
    await waitFor(() => expect(screen.getByTitle('Delete internal note')).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('Delete internal note'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTitle('Delete internal note')).toBeInTheDocument();
    globalThis.fetch = origFetch;
  });
});
