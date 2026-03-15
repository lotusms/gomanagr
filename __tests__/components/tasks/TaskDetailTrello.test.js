/**
 * Unit tests for TaskDetailTrello (Trello-style task edit view):
 * - Renders task header (title, status, due date, priority, assignee, client, project)
 * - Renders Description, Checklist, Save/Cancel
 * - Renders TaskActivityComments in sidebar
 * - Save calls update-task with payload and onSuccess on success
 * - Empty title shows error and does not call update-task
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskDetailTrello from '@/components/tasks/TaskDetailTrello';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {} }),
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('@/components/tasks/TaskActivityComments', () => {
  return function MockTaskActivityComments() {
    return <div data-testid="task-activity-comments">Activity &amp; Comments</div>;
  };
});

describe('TaskDetailTrello', () => {
  let fetchMock;
  let onSuccess;
  let onCancel;

  const defaultTask = {
    id: 'task-1',
    title: 'My task',
    description: 'Task description',
    status: 'to_do',
    priority: 'medium',
    task_number: 'TASK-001',
    assignee_id: null,
    client_id: null,
    project_id: null,
    due_at: null,
    subtasks: [],
  };

  const defaultProps = {
    task: defaultTask,
    userId: 'user-1',
    organizationId: 'org-1',
    teamMembers: [],
    clients: [],
    projects: [],
    onSuccess: () => {},
    onCancel: () => {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    onSuccess = jest.fn();
    onCancel = jest.fn();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  describe('render', () => {
    it('renders task title in header and description section', () => {
      render(<TaskDetailTrello {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      expect(screen.getByDisplayValue('My task')).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Task description')).toBeInTheDocument();
      expect(screen.getByText(/Checklist/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Save\s/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByTestId('task-activity-comments')).toBeInTheDocument();
    });

    it('renders TasksFormHeader with task ID and status', () => {
      render(<TaskDetailTrello {...defaultProps} />);

      expect(screen.getByDisplayValue('TASK-001')).toBeInTheDocument();
      expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Assignee/i)).toBeInTheDocument();
    });

    it('renders Add an item button for checklist', () => {
      render(<TaskDetailTrello {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Add an item/i })).toBeInTheDocument();
    });

    it('create mode: shows Create Task button and activity sidebar (always visible)', () => {
      fetchMock.mockImplementation((url) => {
        if (url && url.includes('get-next-document-id')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggestedId: 'TASK-002' }) });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
      render(<TaskDetailTrello {...defaultProps} task={{}} />);

      expect(screen.getByRole('button', { name: /^Create\s/i })).toBeInTheDocument();
      expect(screen.getByTestId('task-activity-comments')).toBeInTheDocument();
    });
  });

  describe('submit', () => {
    it('calls update-task with payload and onSuccess when Save clicked', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ task: { id: 'task-1', title: 'Updated' } }),
      });

      render(<TaskDetailTrello {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      const titleInput = screen.getByRole('textbox', { name: /Task title/i });
      await act(async () => {
        await userEvent.clear(titleInput);
        await userEvent.type(titleInput, 'Updated title');
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Save\s/i }));
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/update-task',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.taskId).toBe('task-1');
        expect(body.userId).toBe('user-1');
        expect(body.organizationId).toBe('org-1');
        expect(body.title).toBe('Updated title');
      });
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('shows error when title is empty and Save clicked', async () => {
      render(<TaskDetailTrello {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      await act(async () => {
        await userEvent.clear(screen.getByDisplayValue('My task'));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Save\s/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('Cancel button calls onCancel when no changes', () => {
      render(<TaskDetailTrello {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(onCancel).toHaveBeenCalled();
    });

    it('shows discard dialog when Cancel clicked with unsaved changes, Discard calls onCancel', async () => {
      render(<TaskDetailTrello {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      await act(async () => {
        await userEvent.type(screen.getByRole('textbox', { name: /Task title/i }), ' changed');
      });
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      await waitFor(() => {
        expect(screen.getByText(/Discard changes\?/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Stay/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Discard/i })).toBeInTheDocument();
      expect(onCancel).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /Discard/i }));
      await waitFor(() => {
        expect(onCancel).toHaveBeenCalled();
      });
    });
  });

  describe('create mode save', () => {
    it('calls create-task with payload and onSuccess when Create Task clicked', async () => {
      fetchMock.mockImplementation((url) => {
        if (url && url.includes('get-next-document-id')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggestedId: 'TASK-NEW-1' }) });
        }
        if (url && url.includes('create-task')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ task: { id: 'created-1', title: 'New task' } }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(
        <TaskDetailTrello
          {...defaultProps}
          task={{}}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Task/i })).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.type(screen.getByRole('textbox', { name: /Task title/i }), 'New task');
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Create Task/i }));
      });

      await waitFor(() => {
        const createCall = fetchMock.mock.calls.find((c) => String(c[0] || '').includes('create-task'));
        expect(createCall).toBeDefined();
        const body = JSON.parse(createCall[1].body);
        expect(body.userId).toBe('user-1');
        expect(body.organizationId).toBe('org-1');
        expect(body.title).toBe('New task');
        expect(body.status).toBeDefined();
        expect(body.priority).toBeDefined();
        expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 'created-1' }));
      });
    });

    it('shows error when create-task fails', async () => {
      fetchMock.mockImplementation((url) => {
        if (url && url.includes('get-next-document-id')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggestedId: 'TASK-NEW-1' }) });
        }
        if (url && url.includes('create-task')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Server error' }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<TaskDetailTrello {...defaultProps} task={{}} onSuccess={onSuccess} onCancel={onCancel} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Task/i })).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.type(screen.getByRole('textbox', { name: /Task title/i }), 'New task');
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Create Task/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });
  });

  describe('defaultSprintEndDate', () => {
    it('sets due date from defaultSprintEndDate when task has no due_at', async () => {
      fetchMock.mockImplementation((url) => {
        if (url && url.includes('get-next-document-id')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggestedId: 'TASK-1' }) });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(
        <TaskDetailTrello
          {...defaultProps}
          task={{ ...defaultTask, due_at: null }}
          defaultSprintEndDate="2026-03-20"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Sprint ends on:/i)).toBeInTheDocument();
        expect(screen.getByText('2026-03-20')).toBeInTheDocument();
      });
    });
  });

  describe('initial subtasks', () => {
    it('renders existing subtasks with id, title and completed state', () => {
      const taskWithSubtasks = {
        ...defaultTask,
        subtasks: [
          { id: 'st-1', title: 'First', completed: true },
          { id: 'st-2', title: 'Second', completed: false },
        ],
      };

      render(<TaskDetailTrello {...defaultProps} task={taskWithSubtasks} />);

      expect(screen.getByDisplayValue('First')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Second')).toBeInTheDocument();
      const checkboxes = screen.getAllByRole('checkbox');
      const subtaskCheckboxes = checkboxes.filter((c) => c.closest('li'));
      expect(subtaskCheckboxes[0]).toBeChecked();
      expect(subtaskCheckboxes[1]).not.toBeChecked();
    });
  });

  describe('checklist interactions', () => {
    it('adds subtask when Add an item clicked', async () => {
      render(<TaskDetailTrello {...defaultProps} task={{ ...defaultTask, subtasks: [] }} />);

      fireEvent.click(screen.getByRole('button', { name: /Add an item/i }));

      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText('Subtask');
        expect(inputs.length).toBe(1);
      });
    });

    it('toggles subtask completed and removes subtask', async () => {
      const taskWithSubtasks = {
        ...defaultTask,
        subtasks: [{ id: 'st-1', title: 'One', completed: false }],
      };

      render(<TaskDetailTrello {...defaultProps} task={taskWithSubtasks} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(checkboxes[0]);

      await waitFor(() => {
        expect(checkboxes[0]).toBeChecked();
      });

      const removeBtn = screen.getByRole('button', { name: /Remove subtask/i });
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('One')).not.toBeInTheDocument();
      });
    });
  });
});
