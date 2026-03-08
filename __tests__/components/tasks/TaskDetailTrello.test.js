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
      expect(screen.getByLabelText(/Due date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Assignee/i)).toBeInTheDocument();
    });

    it('renders Add an item button for checklist', () => {
      render(<TaskDetailTrello {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Add an item/i })).toBeInTheDocument();
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
    it('Cancel button calls onCancel', () => {
      render(<TaskDetailTrello {...defaultProps} onSuccess={onSuccess} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
