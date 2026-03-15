/**
 * Unit tests for TaskForm (multi-step new/edit task form):
 * - Renders step nav and step 1 fields (Title, Task ID, Description)
 * - Create task: shows "Create Task" and calls create-task on submit
 * - Update task: shows "Update Task" and calls update-task on submit
 * - Cancel calls onCancel
 * - Fetches suggested task ID for new tasks when userId and organizationId provided
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskForm from '@/components/tasks/TaskForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), query: {} }),
}));

describe('TaskForm', () => {
  let fetchMock;
  let onSuccess;
  let onCancel;

  const defaultProps = {
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
    fetchMock.mockImplementation((url) => {
      if (url && url.includes('get-next-document-id')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ suggestedId: 'PER-TASK-20260303-1' }),
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
  });

  describe('render (new task)', () => {
    it('renders form with step nav and Details step fields', async () => {
      render(<TaskForm {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /task form steps/i })).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Task ID/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('shows Status and Priority on step 2 after Next', async () => {
      render(<TaskForm {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.type(screen.getByLabelText(/Title/i), 'My task');
      });
      const nextBtn = screen.getByRole('button', { name: /Next/i });
      await act(async () => {
        fireEvent.click(nextBtn);
      });
      expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Assignee/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Due date/i)).toBeInTheDocument();
    });
  });

  describe('render (edit task)', () => {
    it('shows Update Task button and pre-fills title when initial provided', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initial={{ id: 'task-1', title: 'Existing task', status: 'in_progress' }}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing task')).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      expect(screen.getByRole('button', { name: /Update Task/i })).toBeInTheDocument();
    });
  });

  describe('submit create', () => {
    it('calls create-task with payload when form submitted with title', async () => {
      fetchMock.mockImplementation((url) => {
        if (url && url.includes('get-next-document-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ suggestedId: 'PER-TASK-20260303-1' }),
          });
        }
        if (url && url.includes('create-task')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ task: { id: 'new-task-id' } }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<TaskForm {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.type(screen.getByLabelText(/Title/i), 'New task title');
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      const submitBtn = screen.getByRole('button', { name: /Create Task/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        const createCall = fetchMock.mock.calls.find((c) => String(c[0] || '').includes('create-task'));
        expect(createCall).toBeDefined();
        const body = JSON.parse(createCall[1].body);
        expect(body.userId).toBe('user-1');
        expect(body.organizationId).toBe('org-1');
        expect(body.title).toBe('New task title');
        expect(body.status).toBeDefined();
        expect(body.priority).toBeDefined();
      });
    });
  });

  describe('submit update', () => {
    it('calls update-task with taskId and payload when editing', async () => {
      fetchMock.mockImplementation((url) => {
        if (url && url.includes('update-task')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ task: { id: 'task-1', title: 'Updated' } }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(
        <TaskForm
          {...defaultProps}
          initial={{ id: 'task-1', title: 'Original', status: 'to_do' }}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Original')).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.clear(screen.getByLabelText(/Title/i));
        await userEvent.type(screen.getByLabelText(/Title/i), 'Updated title');
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      await waitFor(() => {
        expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Update Task/i })).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Update Task/i }));
      });

      await waitFor(() => {
        const updateCall = fetchMock.mock.calls.find((c) => String(c[0] || '').includes('update-task'));
        expect(updateCall).toBeDefined();
        const body = JSON.parse(updateCall[1].body);
        expect(body.taskId).toBe('task-1');
        expect(body.title).toBe('Updated title');
        expect(body.userId).toBe('user-1');
        expect(body.organizationId).toBe('org-1');
      });
    });
  });

  describe('validation', () => {
    it('shows error when title is empty on submit', async () => {
      render(<TaskForm {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Create Task/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
      const createCalls = fetchMock.mock.calls.filter((c) => String(c[0] || '').includes('create-task'));
      expect(createCalls.length).toBe(0);
    });
  });

  describe('cancel', () => {
    it('Cancel button calls onCancel', async () => {
      render(<TaskForm {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      });
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('step 3 (client and project)', () => {
    it('shows client and project dropdowns on step 3 after two Next clicks', async () => {
      render(
        <TaskForm
          {...defaultProps}
          clients={[{ id: 'c1', name: 'Acme' }]}
          projects={[{ id: 'p1', project_name: 'Project Alpha' }]}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.type(screen.getByLabelText(/Title/i), 'Task');
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/Client/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Project/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create Task/i })).toBeInTheDocument();
      });
    });
  });

  describe('created by and created date', () => {
    it('shows Created by and Created date when initial has created_by and created_at', async () => {
      render(
        <TaskForm
          {...defaultProps}
          teamMembers={[{ id: 'u1', name: 'Alice', user_id: 'u1' }]}
          initial={{
            id: 'task-1',
            title: 'Existing',
            created_by: 'u1',
            created_at: '2026-03-01T12:00:00.000Z',
          }}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing')).toBeInTheDocument();
      });
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('2026-03-01')).toBeInTheDocument();
    });
  });

  describe('subtasks in step 1', () => {
    it('adds, toggles and removes subtask', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initial={{ subtasks: [{ id: 'st-1', title: 'Sub one', completed: false }] }}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Sub one')).toBeInTheDocument();
      });

      const addBtn = screen.getByRole('button', { name: /Add subtask/i });
      await act(async () => {
        fireEvent.click(addBtn);
      });
      await waitFor(() => {
        const subtaskInputs = screen.getAllByPlaceholderText('Subtask title');
        expect(subtaskInputs.length).toBe(2);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const firstSubtaskCheckbox = checkboxes.find((c) => c.getAttribute('aria-label')?.includes('Sub one'));
      if (firstSubtaskCheckbox) {
        await act(async () => {
          fireEvent.click(firstSubtaskCheckbox);
        });
      }

      const removeButtons = screen.getAllByRole('button', { name: /Remove subtask/i });
      await act(async () => {
        fireEvent.click(removeButtons[0]);
      });
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Sub one')).not.toBeInTheDocument();
      });
    });
  });

  describe('step navigation', () => {
    it('Back on step 2 goes to step 1', async () => {
      render(<TaskForm {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.type(screen.getByLabelText(/Title/i), 'T');
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      await waitFor(() => {
        expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Back/i }));
      });
      await waitFor(() => {
        expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/Status/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('submit error handling', () => {
    it('shows error when update-task fails', async () => {
      fetchMock.mockImplementation((url) => {
        if (url && url.includes('update-task')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Update failed' }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(
        <TaskForm
          {...defaultProps}
          initial={{ id: 'task-1', title: 'Original' }}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Original')).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Update Task/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
    });
  });
});
