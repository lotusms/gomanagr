import { HiPlus, HiTrash } from 'react-icons/hi';
import { TextareaField } from '@/components/ui';
import { getLabelClasses } from '@/components/ui/formControlStyles';

export default function CommunicationLogSection({
  emails,
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
  return (
    <div className="space-y-4">
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Emails</label>
        <div className="space-y-2">
          {emails.map((email, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <TextareaField
                id={`email-${idx}`}
                value={email}
                onChange={(e) => {
                  const updated = [...emails];
                  updated[idx] = e.target.value;
                  onEmailsChange(updated);
                }}
                rows={2}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onEmailsChange(emails.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onEmailsChange([...emails, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Email
          </button>
        </div>
      </div>
      
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Messages</label>
        <div className="space-y-2">
          {messages.map((message, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <TextareaField
                id={`message-${idx}`}
                value={message}
                onChange={(e) => {
                  const updated = [...messages];
                  updated[idx] = e.target.value;
                  onMessagesChange(updated);
                }}
                rows={2}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onMessagesChange(messages.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onMessagesChange([...messages, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Message
          </button>
        </div>
      </div>
      
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Calls</label>
        <div className="space-y-2">
          {calls.map((call, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <TextareaField
                id={`call-${idx}`}
                value={call}
                onChange={(e) => {
                  const updated = [...calls];
                  updated[idx] = e.target.value;
                  onCallsChange(updated);
                }}
                rows={2}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onCallsChange(calls.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onCallsChange([...calls, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Call
          </button>
        </div>
      </div>
      
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Meeting Notes</label>
        <div className="space-y-2">
          {meetingNotes.map((note, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <TextareaField
                id={`meeting-note-${idx}`}
                value={note}
                onChange={(e) => {
                  const updated = [...meetingNotes];
                  updated[idx] = e.target.value;
                  onMeetingNotesChange(updated);
                }}
                rows={2}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onMeetingNotesChange(meetingNotes.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onMeetingNotesChange([...meetingNotes, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Meeting Note
          </button>
        </div>
      </div>
      
      <TextareaField
        id="internalNotes"
        label="Internal Notes"
        value={internalNotes}
        onChange={onInternalNotesChange}
        placeholder="Internal notes (not visible to client)..."
        rows={4}
        variant="light"
      />
    </div>
  );
}
