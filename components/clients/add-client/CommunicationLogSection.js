import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { HiPlus, HiTrash, HiMail, HiChat, HiPhone, HiClipboardList, HiLockClosed } from 'react-icons/hi';
import { ConfirmationDialog } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import EmptyStateCard from './EmptyStateCard';
import SideNavViewerLayout from './SideNavViewerLayout';
import EmailLogCards from './EmailLogCards';
import LogEntryCard from './LogEntryCard';
import InternalNotesView from './InternalNotesView';

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
    description: 'Not visible to client',
    icon: HiLockClosed,
    borderClass: 'border-l-amber-500 dark:border-l-amber-400',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
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
}) {
  const router = useRouter();
  const useEmailsFromApi = Boolean(clientId && userId);
  const [selectedKey, setSelectedKey] = useState(LOG_TYPES[0].key);
  const [hasEmailEntries, setHasEmailEntries] = useState(false);

  const hasEntriesInSelectedSection =
    selectedKey === 'internalNotes'
      ? false
      : selectedKey === 'emails'
        ? useEmailsFromApi
          ? hasEmailEntries
          : (legacyEmails?.length ?? 0) > 0
        : selectedKey === 'messages'
          ? messages.length > 0
          : selectedKey === 'calls'
            ? calls.length > 0
            : meetingNotes.length > 0;

  const handleAddInHeader = () => {
    if (selectedKey === 'emails') {
      if (useEmailsFromApi) router.push(`/dashboard/clients/${clientId}/emails/new`);
      else onEmailsChange([...(legacyEmails ?? []), '']);
    } else if (selectedKey === 'messages') onMessagesChange([...messages, '']);
    else if (selectedKey === 'calls') onCallsChange([...calls, '']);
    else if (selectedKey === 'meetingNotes') onMeetingNotesChange([...meetingNotes, '']);
  };

  const blocks = [
    { type: LOG_TYPES[1], items: messages, onAdd: () => onMessagesChange([...messages, '']), onEdit: (idx, v) => { const u = [...messages]; u[idx] = v; onMessagesChange(u); }, onRemove: (idx) => onMessagesChange(messages.filter((_, i) => i !== idx)) },
    { type: LOG_TYPES[2], items: calls, onAdd: () => onCallsChange([...calls, '']), onEdit: (idx, v) => { const u = [...calls]; u[idx] = v; onCallsChange(u); }, onRemove: (idx) => onCallsChange(calls.filter((_, i) => i !== idx)) },
    { type: LOG_TYPES[3], items: meetingNotes, onAdd: () => onMeetingNotesChange([...meetingNotes, '']), onEdit: (idx, v) => { const u = [...meetingNotes]; u[idx] = v; onMeetingNotesChange(u); }, onRemove: (idx) => onMeetingNotesChange(meetingNotes.filter((_, i) => i !== idx)) },
  ];

  const selectedType = LOG_TYPES.find((t) => t.key === selectedKey);

  const navItems = LOG_TYPES.map((t) => ({
    ...t,
    count: t.key === 'emails' && useEmailsFromApi
      ? null
      : t.key === 'messages'
        ? messages.length
        : t.key === 'calls'
          ? calls.length
          : t.key === 'meetingNotes'
            ? meetingNotes.length
            : null,
  }));

  const viewerHeader = selectedType
    ? {
        icon: selectedType.icon,
        title: selectedType.label,
        description: selectedKey !== 'internalNotes' ? selectedType.description : undefined,
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
    if (selectedKey === 'internalNotes') {
      return <InternalNotesView value={internalNotes} onChange={onInternalNotesChange} />;
    }
    const block = blocks.find((b) => b.type.key === selectedKey);
    if (block) return <LogBlock {...block} />;
    return null;
  };

  return (
    <SideNavViewerLayout
      introText="Keep a record of how you've communicated with this client."
      navAriaLabel="Communication log sections"
      navItems={navItems}
      selectedKey={selectedKey}
      onSelectKey={setSelectedKey}
      viewerHeader={viewerHeader}
      viewerHeaderAction={
        selectedKey !== 'internalNotes' && hasEntriesInSelectedSection ? (
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
