import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { HiPlus, HiTrash, HiMail, HiChat, HiPhone, HiClipboardList, HiLockClosed } from 'react-icons/hi';
import { TextareaField } from '@/components/ui';
import { IconButton, PrimaryButton } from '@/components/ui/buttons';

function clipBody(text, maxLines = 3) {
  if (!text || typeof text !== 'string') return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  const clipped = lines.slice(0, maxLines).join('\n');
  return lines.length > maxLines ? `${clipped}\n…` : clipped;
}

function formatEmailDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
}

const LOG_TYPES = [
  {
    key: 'emails',
    label: 'Emails',
    description: 'Log email threads or key points from correspondence',
    icon: HiMail,
    color: 'primary',
    borderClass: 'border-l-primary-500 dark:border-l-primary-400',
    badgeClass: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'SMS, chat, or other message exchanges',
    icon: HiChat,
    color: 'emerald',
    borderClass: 'border-l-emerald-500 dark:border-l-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  {
    key: 'calls',
    label: 'Calls',
    description: 'Phone or video call summaries',
    icon: HiPhone,
    color: 'violet',
    borderClass: 'border-l-violet-500 dark:border-l-violet-400',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  },
  {
    key: 'meetingNotes',
    label: 'Meeting notes',
    description: 'Notes from in-person or virtual meetings',
    icon: HiClipboardList,
    color: 'amber',
    borderClass: 'border-l-amber-500 dark:border-l-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
];

function EmailsBlock({ clientId, userId, organizationId }) {
  const router = useRouter();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(!!clientId && !!userId);

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

  const type = LOG_TYPES[0];
  const Icon = type.icon;
  const newUrl = `/dashboard/clients/${clientId}/emails/new`;
  const editUrl = (id) => `/dashboard/clients/${clientId}/emails/${id}/edit`;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl shadow-sm ${type.badgeClass}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white tracking-tight">{type.label}</h3>
              {type.description && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{type.description}</p>
              )}
            </div>
          </div>
        </div>
        <PrimaryButton
          type="button"
          onClick={() => router.push(newUrl)}
          className="flex-shrink-0 gap-2"
        >
          <HiPlus className="w-5 h-5" />
          Add
        </PrimaryButton>
      </div>
      <div className="space-y-2.5">
        {loading ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-600 py-6 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading emails…</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-600 py-6 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">No emails yet</p>
          </div>
        ) : (
          emails.map((email) => (
            <button
              key={email.id}
              type="button"
              onClick={() => router.push(editUrl(email.id))}
              className={`w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${type.borderClass} pl-4 pr-4 py-3 min-h-[56px]`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span className="font-medium capitalize">{email.direction}</span>
                <span>·</span>
                <time dateTime={email.sent_at}>{formatEmailDate(email.sent_at)}</time>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{email.subject || 'No subject'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-3 whitespace-pre-wrap">{clipBody(email.body, 3)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function LogBlock({ type, items, onAdd, onEdit, onRemove }) {
  const Icon = type.icon;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl shadow-sm ${type.badgeClass}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white tracking-tight">{type.label}</h3>
              {type.description && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{type.description}</p>
              )}
            </div>
          </div>
        </div>
        <PrimaryButton
          type="button"
          onClick={onAdd}
          className="flex-shrink-0 gap-2"
        >
          <HiPlus className="w-5 h-5" />
          Add
        </PrimaryButton>
      </div>
      <div className="space-y-2.5">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-600 py-6 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">No entries yet</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              className={`group relative rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${type.borderClass} pl-4 pr-11 py-3 min-h-[56px]`}
            >
              <textarea
                id={`${type.key}-${idx}`}
                value={item}
                onChange={(e) => onEdit(idx, e.target.value)}
                rows={2}
                placeholder="Add details..."
                className="w-full text-sm min-h-[2.5rem] resize-y bg-transparent border-0 py-0 px-0 focus:ring-0 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
                aria-label={`${type.label} entry ${idx + 1}`}
              />
              <IconButton
                variant="danger"
                onClick={() => onRemove(idx)}
                className="absolute top-3 right-3 !p-1.5 !bg-transparent !border-transparent hover:!bg-red-50 dark:hover:!bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                title="Remove entry"
                aria-label="Remove entry"
              >
                <HiTrash className="w-4 h-4" />
              </IconButton>
            </div>
          ))
        )}
      </div>
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
  const useEmailsFromApi = Boolean(clientId && userId);
  const blocks = [
    { type: LOG_TYPES[1], items: messages, onAdd: () => onMessagesChange([...messages, '']), onEdit: (idx, v) => { const u = [...messages]; u[idx] = v; onMessagesChange(u); }, onRemove: (idx) => onMessagesChange(messages.filter((_, i) => i !== idx)) },
    { type: LOG_TYPES[2], items: calls, onAdd: () => onCallsChange([...calls, '']), onEdit: (idx, v) => { const u = [...calls]; u[idx] = v; onCallsChange(u); }, onRemove: (idx) => onCallsChange(calls.filter((_, i) => i !== idx)) },
    { type: LOG_TYPES[3], items: meetingNotes, onAdd: () => onMeetingNotesChange([...meetingNotes, '']), onEdit: (idx, v) => { const u = [...meetingNotes]; u[idx] = v; onMeetingNotesChange(u); }, onRemove: (idx) => onMeetingNotesChange(meetingNotes.filter((_, i) => i !== idx)) },
  ];

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-500 dark:text-gray-400 tracking-wide max-w-2xl">
        Keep a record of how you’ve communicated with this client. Add emails, messages, calls, and meeting notes so you can refer back later.
      </p>

      <div className="space-y-6">
        {/* Emails: from API (cards) when clientId/userId provided, else legacy textareas */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700/80 bg-white dark:bg-gray-800/40 p-6 shadow-sm ring-1 ring-gray-100/50 dark:ring-gray-700/30">
          {useEmailsFromApi ? (
            <EmailsBlock clientId={clientId} userId={userId} organizationId={organizationId} />
          ) : (
            <LogBlock
              type={LOG_TYPES[0]}
              items={legacyEmails ?? []}
              onAdd={() => onEmailsChange([...(legacyEmails ?? []), ''])}
              onEdit={(idx, v) => { const u = [...(legacyEmails ?? [])]; u[idx] = v; onEmailsChange(u); }}
              onRemove={(idx) => onEmailsChange((legacyEmails ?? []).filter((_, i) => i !== idx))}
            />
          )}
        </div>
        {blocks.map((block) => (
          <div
            key={block.type.key}
            className="rounded-2xl border border-gray-100 dark:border-gray-700/80 bg-white dark:bg-gray-800/40 p-6 shadow-sm ring-1 ring-gray-100/50 dark:ring-gray-700/30"
          >
            <LogBlock
              type={block.type}
              items={block.items}
              onAdd={block.onAdd}
              onEdit={block.onEdit}
              onRemove={block.onRemove}
            />
          </div>
        ))}
      </div>

      {/* Internal notes – separate card, clearly marked as private */}
      <div className="rounded-2xl border border-amber-200/40 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-900/10 p-6 shadow-sm ring-1 ring-amber-100/50 dark:ring-amber-900/20">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 shadow-sm">
            <HiLockClosed className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white tracking-tight">Internal notes</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">Not visible to client</span>
          </div>
        </div>
        <TextareaField
          id="internalNotes"
          value={internalNotes}
          onChange={onInternalNotesChange}
          placeholder="Private notes about this client—reminders, preferences, follow-ups..."
          rows={4}
          variant="light"
          className="mt-2"
        />
      </div>
    </div>
  );
}
