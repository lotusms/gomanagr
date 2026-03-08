import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import TextareaField from '@/components/ui/TextareaField';
import { PrimaryButton, SecondaryButton, IconButton } from '@/components/ui/buttons';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/config/taskConstants';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import TaskActivityComments from '@/components/tasks/TaskActivityComments';
import { HiArrowLeft, HiPlus, HiTrash } from 'react-icons/hi';
import TasksFormHeader from '@/components/ui/TasksFormHeader';
import { useCancelWithConfirm } from '@/components/ui/DiscardChangesDialog';

function toDateLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const emptyTask = {
  id: null,
  title: '',
  description: '',
  status: 'to_do',
  priority: 'medium',
  assignee_id: '',
  due_at: null,
  client_id: '',
  project_id: '',
  task_number: '',
  subtasks: [],
};

export default function TaskDetailTrello({
  task: initialTask = emptyTask,
  userId,
  organizationId,
  industry = null,
  teamMembers = [],
  clients = [],
  projects = [],
  defaultStatus,
  defaultProjectId,
  defaultClientId,
  defaultAssigneeId,
  onSuccess,
  onCancel,
}) {
  const taskTermSingular = getTermSingular(getTermForIndustry(industry, 'tasks')) || 'Task';
  const clientTermSingular = getTermSingular(getTermForIndustry(industry, 'client')) || 'Client';
  const projectTermSingular = getTermSingular(getTermForIndustry(industry, 'project')) || 'Project';

  const initial = initialTask && typeof initialTask === 'object' ? initialTask : emptyTask;
  const isCreateMode = !initial.id;

  const [task, setTask] = useState(initial);
  const [taskNumber, setTaskNumber] = useState(initial.task_number ?? '');
  const [title, setTitle] = useState(initial.title ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [status, setStatus] = useState(initial.status ?? defaultStatus ?? 'to_do');
  const [priority, setPriority] = useState(initial.priority ?? 'medium');
  const [assigneeId, setAssigneeId] = useState(initial.assignee_id ?? defaultAssigneeId ?? '');
  const [dueAt, setDueAt] = useState(toDateLocal(initial.due_at) || '');
  const [clientId, setClientId] = useState(initial.client_id ?? defaultClientId ?? '');
  const [projectId, setProjectId] = useState(initial.project_id ?? defaultProjectId ?? '');
  const [subtasks, setSubtasks] = useState(() => {
    const raw = initial.subtasks;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((s) => ({
        id: s.id || `st-${Math.random().toString(36).slice(2, 9)}`,
        title: typeof s.title === 'string' ? s.title : '',
        completed: Boolean(s.completed),
      }));
    }
    return [];
  });
  const [editingDescription, setEditingDescription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [suggestedIdFetched, setSuggestedIdFetched] = useState(false);
  useEffect(() => {
    if (!isCreateMode || !userId || !organizationId || suggestedIdFetched) return;
    setSuggestedIdFetched(true);
    fetch('/api/get-next-document-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, organizationId, prefix: 'TASK' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.suggestedId) setTaskNumber(data.suggestedId);
      })
      .catch(() => {});
  }, [isCreateMode, userId, organizationId, suggestedIdFetched]);

  const hasChanges = useCallback(() => {
    if (isCreateMode) {
      return (
        title.trim() !== '' ||
        description.trim() !== '' ||
        status !== (defaultStatus ?? 'to_do') ||
        priority !== 'medium' ||
        assigneeId !== (defaultAssigneeId ?? '') ||
        dueAt !== '' ||
        clientId !== (defaultClientId ?? '') ||
        projectId !== (defaultProjectId ?? '') ||
        subtasks.length > 0 ||
        subtasks.some((s) => (s.title || '').trim() !== '')
      );
    }
    return (
      (title || '').trim() !== (initial.title || '').trim() ||
      (description || '').trim() !== (initial.description || '').trim() ||
      status !== (initial.status ?? 'to_do') ||
      priority !== (initial.priority ?? 'medium') ||
      assigneeId !== (initial.assignee_id ?? '') ||
      dueAt !== (toDateLocal(initial.due_at) || '') ||
      clientId !== (initial.client_id ?? '') ||
      projectId !== (initial.project_id ?? '') ||
      subtasks.length !== (initial.subtasks || []).length ||
      subtasks.some((s, i) => {
        const orig = (initial.subtasks || [])[i];
        return !orig || s.title !== (orig.title || '') || s.completed !== Boolean(orig.completed);
      })
    );
  }, [isCreateMode, title, description, status, priority, assigneeId, dueAt, clientId, projectId, subtasks, initial, defaultStatus, defaultAssigneeId, defaultClientId, defaultProjectId]);

  const { handleCancel, discardDialog } = useCancelWithConfirm(onCancel, hasChanges());

  const statusOptions = TASK_STATUSES.map((s) => ({ value: s.value, label: s.label }));
  const priorityOptions = TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }));
  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...(teamMembers || []).map((m) => ({
      value: m.user_id ?? m.id ?? '',
      label: (m.name || m.displayName || m.email || 'Unknown').trim(),
    })),
  ].filter((o) => o.value != null && o.value !== '');
  const clientOptions = [
    { value: '', label: `No ${clientTermSingular.toLowerCase()}` },
    ...(clients || []).map((c) => ({
      value: c.id,
      label: (c.name || c.companyName || 'Unnamed').trim(),
    })),
  ];
  const projectOptions = [
    { value: '', label: `No ${projectTermSingular.toLowerCase()}` },
    ...(projects || []).map((p) => ({
      value: p.id,
      label: (p.project_name || 'Unnamed project').trim(),
    })),
  ];

  const handleSave = useCallback(async () => {
    setError('');
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    try {
      if (isCreateMode) {
        const res = await fetch('/api/create-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            organizationId,
            title: trimmedTitle,
            description: description.trim() || null,
            status,
            priority,
            assignee_id: assigneeId || null,
            due_at: dueAt ? new Date(dueAt + 'T12:00:00.000Z').toISOString() : null,
            client_id: clientId || null,
            project_id: projectId || null,
            task_number: taskNumber.trim() || undefined,
            subtasks: subtasks.map((s) => ({ id: s.id, title: (s.title || '').trim(), completed: s.completed })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create');
        onSuccess?.(data.task);
      } else {
        const res = await fetch('/api/update-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            organizationId,
            taskId: task.id,
            title: trimmedTitle,
            description: description.trim() || null,
            status,
            priority,
            assignee_id: assigneeId || null,
            due_at: dueAt ? new Date(dueAt + 'T12:00:00.000Z').toISOString() : null,
            client_id: clientId || null,
            project_id: projectId || null,
            subtasks: subtasks.map((s) => ({ id: s.id, title: (s.title || '').trim(), completed: s.completed })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update');
        onSuccess?.(data.task);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }, [isCreateMode, task.id, userId, organizationId, title, description, status, priority, assigneeId, dueAt, clientId, projectId, taskNumber, subtasks, onSuccess]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Left column: card details */}
      <div className="flex-1 min-w-0 space-y-6">
        <TasksFormHeader
          idPrefix="task"
          titleLabel={`${taskTermSingular} title`}
          titleValue={title}
          titlePlaceholder={`e.g. ${taskTermSingular} title`}
          titleRequired
          onTitleChange={(e) => setTitle(e.target.value)}
          documentIdLabel={`${taskTermSingular} ID`}
          documentIdValue={isCreateMode ? taskNumber : (task.task_number || '')}
          documentIdPlaceholder="Auto-generated or enter your own"
          onDocumentIdChange={(e) => isCreateMode && setTaskNumber(e.target.value)}
          statusLabel="Status"
          statusValue={status}
          statusOptions={statusOptions}
          onStatusChange={(e) => setStatus(e.target.value)}
          dueDateValue={dueAt}
          onDueDateChange={(e) => setDueAt(e.target.value)}
          dueDateLabel="Due date"
          priorityValue={priority}
          onPriorityChange={(e) => setPriority(e.target.value)}
          priorityOptions={priorityOptions}
          priorityLabel="Priority"
          assigneeValue={assigneeId}
          onAssigneeChange={(e) => setAssigneeId(e.target.value)}
          assigneeOptions={assigneeOptions}
          assigneeLabel="Assignee"
          assigneePlaceholder="Assign to..."
          clientValue={clientId}
          onClientChange={(e) => setClientId(e.target.value)}
          clientOptions={clientOptions}
          clientLabel={clientTermSingular}
          clientPlaceholder={`Select ${clientTermSingular.toLowerCase()}`}
          projectValue={projectId}
          onProjectChange={(e) => setProjectId(e.target.value)}
          projectOptions={projectOptions}
          projectLabel={projectTermSingular}
          projectPlaceholder={`Select ${projectTermSingular.toLowerCase()}`}
        />
        
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 space-y-6">
            <TextareaField
              id="task-desc-trello"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a more detailed description…"
              rows={4}
              className="mb-2"
            />

            {/* Checklist (Subtasks) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                Checklist
              </h3>
              <ul className="space-y-2">
                {subtasks.map((st) => (
                  <li key={st.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() =>
                        setSubtasks((prev) =>
                          prev.map((s) => (s.id === st.id ? { ...s, completed: !s.completed } : s))
                        )
                      }
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      value={st.title}
                      onChange={(e) =>
                        setSubtasks((prev) =>
                          prev.map((s) => (s.id === st.id ? { ...s, title: e.target.value } : s))
                        )
                      }
                      className={`flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm ${st.completed ? 'line-through text-gray-500' : ''}`}
                      placeholder="Subtask"
                    />
                    <IconButton
                      variant="danger"
                      onClick={() => setSubtasks((prev) => prev.filter((s) => s.id !== st.id))}
                      aria-label={`Remove subtask ${st.title ? `"${st.title}"` : ''}`.trim() || 'Remove subtask'}
                      className="flex-shrink-0"
                    >
                      <HiTrash className="w-4 h-4" />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <SecondaryButton
                type="button"
                onClick={() =>
                  setSubtasks((prev) => [
                    ...prev,
                    { id: `st-${Math.random().toString(36).slice(2, 9)}`, title: '', completed: false },
                  ])
                }
                className="mt-2 !min-w-0 px-3 py-1.5 text-xs gap-1.5"
              >
                <HiPlus className="w-3.5 h-3.5" />
                Add an item
              </SecondaryButton>
            </div>
          </div>
        </div>

        <div>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm" role="alert">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <SecondaryButton type="button" onClick={handleCancel}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isCreateMode ? `Create ${taskTermSingular}` : `Save ${taskTermSingular}`}
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* Right column: comments and activity (only when task exists) */}
      {task.id && (
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="lg:sticky lg:top-4">
            <TaskActivityComments
              taskId={task.id}
              organizationId={organizationId}
              userId={userId}
              teamMembers={teamMembers}
              taskTermSingular={taskTermSingular}
              clientTermSingular={clientTermSingular}
              projectTermSingular={projectTermSingular}
            />
          </div>
        </aside>
      )}

      {discardDialog}
    </div>
  );
}
