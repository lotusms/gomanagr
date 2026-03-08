import { useState, useCallback, useEffect } from 'react';
import InputField from '@/components/ui/InputField';
import TextareaField from '@/components/ui/TextareaField';
import Dropdown from '@/components/ui/Dropdown';
import DateField from '@/components/ui/DateField';
import { FormStepContent, FormStepSection, FormStepNav, FormStepFooter } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/config/taskConstants';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

function toDateLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TaskForm({
  initial = {},
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
  const taskTermSingularLower = taskTermSingular.toLowerCase();
  const clientTermSingular = getTermSingular(getTermForIndustry(industry, 'client')) || 'Client';
  const projectTermSingular = getTermSingular(getTermForIndustry(industry, 'project')) || 'Project';

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState(initial.title ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [status, setStatus] = useState(initial.status ?? defaultStatus ?? 'to_do');
  const [priority, setPriority] = useState(initial.priority ?? 'medium');
  const [assigneeId, setAssigneeId] = useState(initial.assignee_id ?? defaultAssigneeId ?? '');
  const [dueAt, setDueAt] = useState(toDateLocal(initial.due_at) || '');
  const [projectId, setProjectId] = useState(initial.project_id ?? defaultProjectId ?? '');
  const [clientId, setClientId] = useState(initial.client_id ?? defaultClientId ?? '');
  const [labels, setLabels] = useState(
    Array.isArray(initial.labels) ? initial.labels.join(', ') : ''
  );
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
  const [taskNumber, setTaskNumber] = useState(initial.task_number ?? '');
  const [taskNumberSuggested, setTaskNumberSuggested] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [step, setStep] = useState(1);
  const markDirty = useCallback(() => setHasChanges(true), []);

  useEffect(() => {
    if (initial.id || !userId || !organizationId || taskNumberSuggested) return;
    fetch('/api/get-next-document-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, organizationId, prefix: 'TASK' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.suggestedId) {
          setTaskNumber((prev) => (prev.trim() ? prev : data.suggestedId));
          setTaskNumberSuggested(true);
        }
      })
      .catch(() => {});
  }, [userId, organizationId, initial.id, taskNumberSuggested]);

  const STEPS = [
    { id: 1, label: 'Details' },
    { id: 2, label: 'Status & assignment' },
    { id: 3, label: `Link to ${clientTermSingular.toLowerCase()} or ${projectTermSingular.toLowerCase()}` },
  ];

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...(teamMembers || []).map((m) => ({
      value: m.id || m.user_id,
      label: (m.name || m.displayName || m.email || 'Unknown').trim(),
    })),
  ].filter((o) => o.value !== undefined && o.value !== null);

  const statusOptions = TASK_STATUSES.map((s) => ({ value: s.value, label: s.label }));
  const priorityOptions = TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }));

  const clientOptions = [
    { value: '', label: `Select ${clientTermSingular.toLowerCase()}` },
    ...(clients || []).map((c) => ({
      value: c.id,
      label: (c.name || c.companyName || 'Unnamed').trim(),
    })),
  ];

  const projectOptions = [
    { value: '', label: `Select ${projectTermSingular.toLowerCase()}` },
    ...(projects || []).map((p) => ({
      value: p.id,
      label: (p.project_name || 'Unnamed project').trim(),
    })),
  ];

  const creator = (teamMembers || []).find((m) => (m.id || m.user_id) === initial.created_by);
  const creatorName = initial.created_by
    ? (creator?.name || creator?.displayName || creator?.email || 'Unknown').trim()
    : 'You';
  const createdDateDisplay = initial.created_at
    ? toDateLocal(initial.created_at)
    : toDateLocal(new Date().toISOString());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        userId,
        organizationId,
        title: trimmedTitle,
        description: description.trim() || null,
        status,
        priority,
        assignee_id: assigneeId || null,
        due_at: dueAt ? new Date(dueAt + 'T12:00:00.000Z').toISOString() : null,
        project_id: projectId || null,
        client_id: clientId || null,
        task_number: taskNumber.trim() || undefined,
        labels: labels
          ? labels
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        subtasks: subtasks.map((s) => ({ id: s.id, title: (s.title || '').trim(), completed: s.completed })),
      };
      if (initial.id) {
        const res = await fetch('/api/update-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            taskId: initial.id,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update');
        onSuccess?.(data.task);
      } else {
        const res = await fetch('/api/create-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create');
        onSuccess?.(data.task);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const submitLabel = initial.id ? `Update ${taskTermSingular}` : `Create ${taskTermSingular}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm" role="alert">
          {error}
        </div>
      )}

      <FormStepNav
        steps={STEPS}
        currentStep={step}
        onStepChange={setStep}
        ariaLabel={`${taskTermSingular} form steps`}
      />

      <FormStepContent>
        {step === 1 && (
          <FormStepSection>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <InputField
                id="task-title"
                label="Title"
                required
                value={title}
                onChange={(e) => { markDirty(); setTitle(e.target.value); }}
                placeholder={`${taskTermSingular} title`}
                variant="light"
              />
              <InputField
                id="task-number"
                label={`${taskTermSingular} ID`}
                value={taskNumber}
                onChange={(e) => { markDirty(); setTaskNumber(e.target.value); }}
                placeholder="Auto-generated or enter your own"
                variant="light"
              />
            </div>
            <TextareaField
              id="task-description"
              label="Description"
              value={description}
              onChange={(e) => { markDirty(); setDescription(e.target.value); }}
              placeholder="Optional details"
              rows={3}
            />
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subtasks</label>
              <ul className="space-y-2">
                {subtasks.map((st) => (
                  <li key={st.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => {
                        markDirty();
                        setSubtasks((prev) =>
                          prev.map((s) => (s.id === st.id ? { ...s, completed: !s.completed } : s))
                        );
                      }}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      aria-label={`Mark "${st.title || 'subtask'}" ${st.completed ? 'incomplete' : 'complete'}`}
                    />
                    <input
                      type="text"
                      value={st.title}
                      onChange={(e) => {
                        markDirty();
                        setSubtasks((prev) =>
                          prev.map((s) => (s.id === st.id ? { ...s, title: e.target.value } : s))
                        );
                      }}
                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
                      placeholder="Subtask title"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        markDirty();
                        setSubtasks((prev) => prev.filter((s) => s.id !== st.id));
                      }}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-sm"
                      aria-label="Remove subtask"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  markDirty();
                  setSubtasks((prev) => [
                    ...prev,
                    { id: `st-${Math.random().toString(36).slice(2, 9)}`, title: '', completed: false },
                  ]);
                }}
                className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                + Add subtask
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-600">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Created by</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{creatorName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Created date</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{createdDateDisplay}</p>
              </div>
            </div>
          </FormStepSection>
        )}

        {step === 2 && (
          <FormStepSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Dropdown
                id="task-status"
                name="status"
                label="Status"
                value={status}
                onChange={(e) => { markDirty(); setStatus(e.target.value); }}
                options={statusOptions}
              />
              <Dropdown
                id="task-priority"
                name="priority"
                label="Priority"
                value={priority}
                onChange={(e) => { markDirty(); setPriority(e.target.value); }}
                options={priorityOptions}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Dropdown
                id="task-assignee"
                name="assignee"
                label="Assignee"
                value={assigneeId}
                onChange={(e) => { markDirty(); setAssigneeId(e.target.value); }}
                options={assigneeOptions}
                placeholder="Select assignee"
              />
              <DateField
                id="task-due"
                label="Due date"
                value={dueAt}
                onChange={(e) => { markDirty(); setDueAt(e.target.value); }}
                variant="light"
              />
            </div>
          </FormStepSection>
        )}

        {step === 3 && (
          <FormStepSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Dropdown
                id="task-client"
                name="client"
                label={clientTermSingular}
                value={clientId}
                onChange={(e) => { markDirty(); setClientId(e.target.value); }}
                options={clientOptions}
              />
              <Dropdown
                id="task-project"
                name="project"
                label={projectTermSingular}
                value={projectId}
                onChange={(e) => { markDirty(); setProjectId(e.target.value); }}
                options={projectOptions}
              />
            </div>
            <div className="mt-4">
              <InputField
                id="task-labels"
                label="Labels / tags"
                value={labels}
                onChange={(e) => { markDirty(); setLabels(e.target.value); }}
                placeholder="Comma-separated (e.g. bug, urgent)"
                variant="light"
              />
            </div>
          </FormStepSection>
        )}
      </FormStepContent>

      <FormStepFooter
        step={step}
        totalSteps={STEPS.length}
        onBack={() => setStep(step - 1)}
        onCancel={onCancel}
        onNext={() => setStep(step + 1)}
        submitLabel={submitLabel}
        onSubmitClick={(e) => handleSubmit({ preventDefault: () => {} })}
        saving={saving}
        submitDisabled={false}
        hasChanges={hasChanges}
      />
    </form>
  );
}
