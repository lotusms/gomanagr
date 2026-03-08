import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { HiPlus, HiTrash, HiMail, HiChat, HiPhone, HiClipboardList, HiLockClosed } from 'react-icons/hi';
import { ConfirmationDialog } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import EmptyStateCard from './EmptyStateCard';
import SideNavViewerLayout from './SideNavViewerLayout';
import EmailLogCards from './EmailLogCards';
import MessageLogCards from './MessageLogCards';
import CallLogCards from './CallLogCards';
import MeetingNoteLogCards from './MeetingNoteLogCards';
import InternalNoteLogCards from './InternalNoteLogCards';
import LogEntryCard from './LogEntryCard';
import InternalNotesView from './InternalNotesView';
import { getTermForIndustry, getTermSingular } from '../clientProfileConstants';

export const LOG_TYPES = [
  {
    key: 'emails',
    label: 'Emails',
    description: 'Log email threads or key points from correspondence',
    icon: HiMail,
    borderClass: 'border-l-primary-500 dark:border-l-primary-400',
    badgeClass: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'SMS, chat, or other message exchanges',
    icon: HiChat,
    borderClass: 'border-l-emerald-500 dark:border-l-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  {
    key: 'calls',
    label: 'Calls',
    description: 'Phone or video call summaries',
    icon: HiPhone,
    borderClass: 'border-l-violet-500 dark:border-l-violet-400',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  },
  {
    key: 'meetingNotes',
    label: 'Meeting notes',
    description: 'Notes from in-person or virtual meetings',
    icon: HiClipboardList,
    borderClass: 'border-l-amber-500 dark:border-l-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
  {
    key: 'internalNotes',
    label: 'Internal notes',
    description: 'Not visible to client', // overridden per industry in component
    icon: HiLockClosed,
    borderClass: 'border-l-slate-500 dark:border-l-slate-400',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200',
  },
];

function EmailsBlock({ clientId, userId, organizationId, onHasEntries }) {
  const router = useRouter();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(!!clientId && !!userId);
  const [emailToDelete, setEmailToDelete] = useState(null);

  useEffect(() => {
    if (!clientId || !userId) return;
    setLoading(true);
    fetch('/api/get-client-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setEmails(data.emails || []))
      .catch(() => setEmails([]))
      .finally(() => setLoading(false));
  }, [clientId, userId, organizationId]);

  useEffect(() => {
    if (onHasEntries && !loading) onHasEntries(emails.length > 0);
  }, [emails.length, loading, onHasEntries]);

  const type = LOG_TYPES[0];
  const newUrl = `/dashboard/clients/${clientId}/emails/new`;
  const editUrl = (id) => `/dashboard/clients/${clientId}/emails/${id}/edit`;
  const handleSelectEmail = (id) => router.push(editUrl(id));

  const handleDeleteConfirm = async () => {
    if (!emailToDelete) return;
    try {
      const res = await fetch('/api/delete-client-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          emailId: emailToDelete,
          organizationId: organizationId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setEmails((prev) => prev.filter((e) => e.id !== emailToDelete));
      setEmailToDelete(null);
    } catch (err) {
      console.error(err);
      setEmailToDelete(null);
    }
  };

  if (loading) {
    return (
      <EmptyStateCard
        message="Loading emails…"
      />
    );
  }

  if (emails.length === 0) {
    return (
      <EmptyStateCard
        message="No emails yet"
        action={
          <PrimaryButton type="button" onClick={() => router.push(newUrl)} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add email
          </PrimaryButton>
        }
      />
    );
  }

  return (
    <>
      <EmailLogCards
        emails={emails}
        onSelect={handleSelectEmail}
        onDelete={setEmailToDelete}
        borderClass={type.borderClass}
      />
      <ConfirmationDialog
        isOpen={!!emailToDelete}
        onClose={() => setEmailToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete email"
        message="This email log entry will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}

function MessagesBlock({ clientId, userId, organizationId, onHasEntries }) {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(!!clientId && !!userId);
  const [messageToDelete, setMessageToDelete] = useState(null);

  useEffect(() => {
    if (!clientId || !userId) return;
    setLoading(true);
    fetch('/api/get-client-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [clientId, userId, organizationId]);

  useEffect(() => {
    if (onHasEntries && !loading) onHasEntries(messages.length > 0);
  }, [messages.length, loading, onHasEntries]);

  const type = LOG_TYPES[1];
  const newUrl = `/dashboard/clients/${clientId}/messages/new`;
  const editUrl = (id) => `/dashboard/clients/${clientId}/messages/${id}/edit`;
  const handleSelectMessage = (id) => router.push(editUrl(id));

  const handleDeleteConfirm = async () => {
    if (!messageToDelete) return;
    try {
      const res = await fetch('/api/delete-client-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          messageId: messageToDelete,
          organizationId: organizationId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageToDelete));
      setMessageToDelete(null);
    } catch (err) {
      console.error(err);
      setMessageToDelete(null);
    }
  };

  if (loading) {
    return <EmptyStateCard message="Loading messages…" />;
  }

  if (messages.length === 0) {
    return (
      <EmptyStateCard
        message="No messages yet"
        action={
          <PrimaryButton type="button" onClick={() => router.push(newUrl)} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add message
          </PrimaryButton>
        }
      />
    );
  }

  return (
    <>
      <MessageLogCards
        messages={messages}
        onSelect={handleSelectMessage}
        onDelete={setMessageToDelete}
        borderClass={type.borderClass}
      />
      <ConfirmationDialog
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete message"
        message="This message log entry will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}

function CallsBlock({ clientId, userId, organizationId, onHasEntries }) {
  const router = useRouter();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(!!clientId && !!userId);
  const [callToDelete, setCallToDelete] = useState(null);

  useEffect(() => {
    if (!clientId || !userId) return;
    setLoading(true);
    fetch('/api/get-client-calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setCalls(data.calls || []))
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }, [clientId, userId, organizationId]);

  useEffect(() => {
    if (onHasEntries && !loading) onHasEntries(calls.length > 0);
  }, [calls.length, loading, onHasEntries]);

  const type = LOG_TYPES[2];
  const newUrl = `/dashboard/clients/${clientId}/calls/new`;
  const editUrl = (id) => `/dashboard/clients/${clientId}/calls/${id}/edit`;
  const handleSelectCall = (id) => router.push(editUrl(id));

  const handleDeleteConfirm = async () => {
    if (!callToDelete) return;
    try {
      const res = await fetch('/api/delete-client-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          callId: callToDelete,
          organizationId: organizationId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setCalls((prev) => prev.filter((c) => c.id !== callToDelete));
      setCallToDelete(null);
    } catch (err) {
      console.error(err);
      setCallToDelete(null);
    }
  };

  if (loading) {
    return <EmptyStateCard message="Loading calls…" />;
  }

  if (calls.length === 0) {
    return (
      <EmptyStateCard
        message="No calls yet"
        action={
          <PrimaryButton type="button" onClick={() => router.push(newUrl)} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add call
          </PrimaryButton>
        }
      />
    );
  }

  return (
    <>
      <CallLogCards
        calls={calls}
        onSelect={handleSelectCall}
        onDelete={setCallToDelete}
        borderClass={type.borderClass}
      />
      <ConfirmationDialog
        isOpen={!!callToDelete}
        onClose={() => setCallToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete call"
        message="This call log entry will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}

function MeetingNotesBlock({ clientId, userId, organizationId, onHasEntries }) {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(!!clientId && !!userId);
  const [noteToDelete, setNoteToDelete] = useState(null);

  useEffect(() => {
    if (!clientId || !userId) return;
    setLoading(true);
    fetch('/api/get-client-meeting-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setNotes(data.notes || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [clientId, userId, organizationId]);

  useEffect(() => {
    if (onHasEntries && !loading) onHasEntries(notes.length > 0);
  }, [notes.length, loading, onHasEntries]);

  const type = LOG_TYPES[3];
  const newUrl = `/dashboard/clients/${clientId}/meeting-notes/new`;
  const editUrl = (id) => `/dashboard/clients/${clientId}/meeting-notes/${id}/edit`;
  const handleSelectNote = (id) => router.push(editUrl(id));

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      const res = await fetch('/api/delete-client-meeting-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          noteId: noteToDelete,
          organizationId: organizationId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete));
      setNoteToDelete(null);
    } catch (err) {
      console.error(err);
      setNoteToDelete(null);
    }
  };

  if (loading) {
    return <EmptyStateCard message="Loading meeting notes…" />;
  }

  if (notes.length === 0) {
    return (
      <EmptyStateCard
        message="No meeting notes yet"
        action={
          <PrimaryButton type="button" onClick={() => router.push(newUrl)} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add meeting note
          </PrimaryButton>
        }
      />
    );
  }

  return (
    <>
      <MeetingNoteLogCards
        notes={notes}
        onSelect={handleSelectNote}
        onDelete={setNoteToDelete}
        borderClass={type.borderClass}
      />
      <ConfirmationDialog
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete meeting note"
        message="This meeting note will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}

function InternalNotesBlock({ clientId, userId, organizationId, onHasEntries, industry }) {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(!!clientId && !!userId);
  const [noteToDelete, setNoteToDelete] = useState(null);

  useEffect(() => {
    if (!clientId || !userId) return;
    setLoading(true);
    fetch('/api/get-client-internal-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientId, organizationId: organizationId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => setNotes(data.notes || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [clientId, userId, organizationId]);

  useEffect(() => {
    if (onHasEntries && !loading) onHasEntries(notes.length > 0);
  }, [notes.length, loading, onHasEntries]);

  const type = LOG_TYPES[4];
  const newUrl = `/dashboard/clients/${clientId}/internal-notes/new`;
  const editUrl = (id) => `/dashboard/clients/${clientId}/internal-notes/${id}/edit`;
  const handleSelectNote = (id) => router.push(editUrl(id));

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      const res = await fetch('/api/delete-client-internal-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          noteId: noteToDelete,
          organizationId: organizationId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete));
      setNoteToDelete(null);
    } catch (err) {
      console.error(err);
      setNoteToDelete(null);
    }
  };

  if (loading) {
    return <EmptyStateCard message="Loading internal notes…" />;
  }

  if (notes.length === 0) {
    return (
      <EmptyStateCard
        message="No internal notes yet"
        action={
          <PrimaryButton type="button" onClick={() => router.push(newUrl)} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add internal note
          </PrimaryButton>
        }
      />
    );
  }

  return (
    <>
      <InternalNoteLogCards
        notes={notes}
        onSelect={handleSelectNote}
        onDelete={setNoteToDelete}
        borderClass={type.borderClass}
        currentUserId={userId}
        industry={industry}
      />
      <ConfirmationDialog
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete internal note"
        message="This internal note will be permanently deleted. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}

function LogBlock({ type, items, onAdd, onEdit, onRemove }) {
  if (items.length === 0) {
    return (
      <EmptyStateCard
        message="No entries yet"
        action={
          <PrimaryButton type="button" onClick={onAdd} className="gap-2">
            <HiPlus className="w-5 h-5" />
            Add
          </PrimaryButton>
        }
      />
    );
  }
  
  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => (
        <LogEntryCard
          key={idx}
          id={`${type.key}-${idx}`}
          value={item}
          onChange={(v) => onEdit(idx, v)}
          onRemove={() => onRemove(idx)}
          ariaLabel={`${type.label} entry ${idx + 1}`}
          borderClass={type.borderClass}
        />
      ))}
    </div>
  );
}

const VALID_SECTION_KEYS = LOG_TYPES.map((t) => t.key);

export default function CommunicationLogSection({
  clientId,
  userId,
  organizationId,
  emails: legacyEmails,
  messages,
  calls,
  meetingNotes,
  internalNotes,
  onEmailsChange,
  onMessagesChange,
  onCallsChange,
  onMeetingNotesChange,
  onInternalNotesChange,
  initialSection,
  industry,
}) {
  const router = useRouter();
  const clientTermSingular = getTermSingular(getTermForIndustry(industry, 'client')) || 'Client';
  const clientTermSingularLower = clientTermSingular.toLowerCase();
  const useEmailsFromApi = Boolean(clientId && userId);
  const useMessagesFromApi = Boolean(clientId && userId);
  const useCallsFromApi = Boolean(clientId && userId);
  const useMeetingNotesFromApi = Boolean(clientId && userId);
  const useInternalNotesFromApi = Boolean(clientId && userId);
  const defaultKey = initialSection && VALID_SECTION_KEYS.includes(initialSection) ? initialSection : LOG_TYPES[0].key;
  const [selectedKey, setSelectedKey] = useState(defaultKey);

  useEffect(() => {
    if (initialSection && VALID_SECTION_KEYS.includes(initialSection)) {
      setSelectedKey(initialSection);
    }
  }, [initialSection]);

  const [hasEmailEntries, setHasEmailEntries] = useState(false);
  const [hasMessageEntries, setHasMessageEntries] = useState(false);
  const [hasCallEntries, setHasCallEntries] = useState(false);
  const [hasMeetingNoteEntries, setHasMeetingNoteEntries] = useState(false);
  const [hasInternalNoteEntries, setHasInternalNoteEntries] = useState(false);

  const hasEntriesInSelectedSection =
    selectedKey === 'internalNotes'
      ? useInternalNotesFromApi ? hasInternalNoteEntries : false
      : selectedKey === 'emails'
        ? useEmailsFromApi
          ? hasEmailEntries
          : (legacyEmails?.length ?? 0) > 0
        : selectedKey === 'messages'
          ? useMessagesFromApi
            ? hasMessageEntries
            : messages.length > 0
          : selectedKey === 'calls'
            ? useCallsFromApi
              ? hasCallEntries
              : calls.length > 0
            : selectedKey === 'meetingNotes'
              ? useMeetingNotesFromApi
                ? hasMeetingNoteEntries
                : meetingNotes.length > 0
              : false;

  const handleAddInHeader = () => {
    if (selectedKey === 'emails') {
      if (useEmailsFromApi) router.push(`/dashboard/clients/${clientId}/emails/new`);
      else onEmailsChange([...(legacyEmails ?? []), '']);
    } else if (selectedKey === 'messages') {
      if (useMessagesFromApi) router.push(`/dashboard/clients/${clientId}/messages/new`);
      else onMessagesChange([...messages, '']);
    } else if (selectedKey === 'calls') {
      if (useCallsFromApi) router.push(`/dashboard/clients/${clientId}/calls/new`);
      else onCallsChange([...calls, '']);
    } else if (selectedKey === 'meetingNotes') {
      if (useMeetingNotesFromApi) router.push(`/dashboard/clients/${clientId}/meeting-notes/new`);
      else onMeetingNotesChange([...meetingNotes, '']);
    } else if (selectedKey === 'internalNotes' && useInternalNotesFromApi) {
      router.push(`/dashboard/clients/${clientId}/internal-notes/new`);
    }
  };

  const blocks = [
    { type: LOG_TYPES[1], items: messages, onAdd: () => onMessagesChange([...messages, '']), onEdit: (idx, v) => { const u = [...messages]; u[idx] = v; onMessagesChange(u); }, onRemove: (idx) => onMessagesChange(messages.filter((_, i) => i !== idx)) },
    { type: LOG_TYPES[2], items: calls, onAdd: () => onCallsChange([...calls, '']), onEdit: (idx, v) => { const u = [...calls]; u[idx] = v; onCallsChange(u); }, onRemove: (idx) => onCallsChange(calls.filter((_, i) => i !== idx)) },
    { type: LOG_TYPES[3], items: meetingNotes, onAdd: () => onMeetingNotesChange([...meetingNotes, '']), onEdit: (idx, v) => { const u = [...meetingNotes]; u[idx] = v; onMeetingNotesChange(u); }, onRemove: (idx) => onMeetingNotesChange(meetingNotes.filter((_, i) => i !== idx)) },
  ];

  const selectedType = LOG_TYPES.find((t) => t.key === selectedKey);

  const navItems = LOG_TYPES.map((t) => ({
    ...t,
    description: t.key === 'internalNotes' ? `Not visible to ${clientTermSingularLower}` : t.description,
    count: t.key === 'emails' && useEmailsFromApi
      ? null
      : t.key === 'messages' && useMessagesFromApi
        ? null
        : t.key === 'messages'
          ? messages.length
          : t.key === 'calls' && useCallsFromApi
            ? null
            : t.key === 'calls'
              ? calls.length
              : t.key === 'meetingNotes' && useMeetingNotesFromApi
                ? null
                : t.key === 'meetingNotes'
                  ? meetingNotes.length
                  : null,
  }));

  const viewerHeader = selectedType
    ? {
        icon: selectedType.icon,
        title: selectedType.label,
        description: selectedKey === 'internalNotes' ? `Not visible to ${clientTermSingularLower}` : selectedType.description,
        badgeClass: selectedType.badgeClass,
      }
    : null;

  const renderViewer = () => {
    if (selectedKey === 'emails') {
      if (useEmailsFromApi) {
        return (
          <EmailsBlock
            clientId={clientId}
            userId={userId}
            organizationId={organizationId}
            onHasEntries={setHasEmailEntries}
          />
        );
      }
      const block = {
        type: LOG_TYPES[0],
        items: legacyEmails ?? [],
        onAdd: () => onEmailsChange([...(legacyEmails ?? []), '']),
        onEdit: (idx, v) => { const u = [...(legacyEmails ?? [])]; u[idx] = v; onEmailsChange(u); },
        onRemove: (idx) => onEmailsChange((legacyEmails ?? []).filter((_, i) => i !== idx)),
      };
      return <LogBlock {...block} />;
    }
    if (selectedKey === 'messages' && useMessagesFromApi) {
      return (
        <MessagesBlock
          clientId={clientId}
          userId={userId}
          organizationId={organizationId}
          onHasEntries={setHasMessageEntries}
        />
      );
    }
    if (selectedKey === 'calls' && useCallsFromApi) {
      return (
        <CallsBlock
          clientId={clientId}
          userId={userId}
          organizationId={organizationId}
          onHasEntries={setHasCallEntries}
        />
      );
    }
    if (selectedKey === 'meetingNotes' && useMeetingNotesFromApi) {
      return (
        <MeetingNotesBlock
          clientId={clientId}
          userId={userId}
          organizationId={organizationId}
          onHasEntries={setHasMeetingNoteEntries}
        />
      );
    }
    if (selectedKey === 'internalNotes') {
      if (useInternalNotesFromApi) {
        return (
          <InternalNotesBlock
            clientId={clientId}
            userId={userId}
            organizationId={organizationId}
            onHasEntries={setHasInternalNoteEntries}
            industry={industry}
          />
        );
      }
      return <InternalNotesView value={internalNotes} onChange={onInternalNotesChange} clientTermSingularLower={clientTermSingularLower} />;
    }
    const block = blocks.find((b) => b.type.key === selectedKey);
    if (block) return <LogBlock {...block} />;
    return null;
  };

  return (
    <SideNavViewerLayout
      introText={`Keep a record of how you've communicated with this ${clientTermSingularLower}.`}
      navAriaLabel="Communication log sections"
      navItems={navItems}
      selectedKey={selectedKey}
      onSelectKey={setSelectedKey}
      viewerHeader={viewerHeader}
      viewerHeaderAction={
        hasEntriesInSelectedSection ? (
          <PrimaryButton type="button" onClick={handleAddInHeader} className="gap-2 flex-shrink-0">
            <HiPlus className="w-5 h-5" />
            Add
          </PrimaryButton>
        ) : null
      }
    >
      {renderViewer()}
    </SideNavViewerLayout>
  );
}
