/**
 * Unit tests for TaskActivityComments
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskActivityComments from '@/components/tasks/TaskActivityComments';

const mockCurrentUser = { uid: 'u1', email: 'u@test.com' };
jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {} }),
}));
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser: mockCurrentUser }),
}));
jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => ({ displayName: 'Test User', email: 'u@test.com' }),
  getDisplayName: (acc, email) => acc?.displayName || email || 'You',
}));

describe('TaskActivityComments', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows loading then empty state when taskId is null', async () => {
    render(
      <TaskActivityComments
        taskId={null}
        organizationId="org-1"
        userId="u1"
      />
    );
    await waitFor(() => {
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });
    expect(screen.getByText('No comments yet')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Save the .* first to add a comment/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add comment/i })).toBeDisabled();
  });

  it('fetches and shows activity and comments when taskId is set', async () => {
    global.fetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ activity: [{ id: 'a1', user_id: 'u1', kind: 'created', created_at: new Date().toISOString() }] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ comments: [{ id: 'c1', user_id: 'u1', body: 'A comment', created_at: new Date().toISOString() }] }) });

    render(
      <TaskActivityComments
        taskId="task-1"
        organizationId="org-1"
        userId="u1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/created this task/i)).toBeInTheDocument();
    });
    expect(screen.getByText('A comment')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write a comment…')).toBeInTheDocument();
  });

  it('submits new comment and appends to list', async () => {
    global.fetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ activity: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ comments: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            comment: { id: 'c2', user_id: 'u1', body: 'New comment', created_at: new Date().toISOString() },
          }),
      });

    render(
      <TaskActivityComments
        taskId="task-1"
        organizationId="org-1"
        userId="u1"
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Write a comment…')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Write a comment…'), { target: { value: 'New comment' } });
    fireEvent.click(screen.getByRole('button', { name: /Add comment/i }));

    await waitFor(() => {
      expect(screen.getByText('New comment')).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/add-task-comment',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ userId: 'u1', organizationId: 'org-1', taskId: 'task-1', body: 'New comment' }),
      })
    );
  });

  it('shows activity messages for status, assignee, due_at, title, priority, client, project', async () => {
    const now = new Date().toISOString();
    const activity = [
      { id: 'a1', user_id: 'u1', kind: 'status', old_value: 'backlog', new_value: 'to_do', created_at: now },
      { id: 'a2', user_id: 'u1', kind: 'assignee', old_value: null, new_value: 'u2', created_at: now },
      { id: 'a3', user_id: 'u1', kind: 'due_at', old_value: '2026-01-01', new_value: '2026-01-15', created_at: now },
      { id: 'a4', user_id: 'u1', kind: 'title', created_at: now },
      { id: 'a5', user_id: 'u1', kind: 'priority', old_value: 'low', new_value: 'high', created_at: now },
      { id: 'a6', user_id: 'u1', kind: 'client', created_at: now },
      { id: 'a7', user_id: 'u1', kind: 'project', created_at: now },
    ];
    global.fetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ activity }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ comments: [] }) });

    render(
      <TaskActivityComments
        taskId="t1"
        organizationId="org-1"
        userId="u1"
        teamMembers={[{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/changed status from Backlog to To do/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/reassigned from Unassigned to Bob/i)).toBeInTheDocument();
    expect(screen.getByText(/changed due date from/i)).toBeInTheDocument();
    expect(screen.getByText(/renamed the task/i)).toBeInTheDocument();
    expect(screen.getByText(/changed priority from Low to High/i)).toBeInTheDocument();
    expect(screen.getByText(/updated the Client of the task/i)).toBeInTheDocument();
    expect(screen.getByText(/updated the Project of the task/i)).toBeInTheDocument();
  });

  it('shows fallback activity message for unknown kind', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            activity: [{ id: 'a1', user_id: 'u1', kind: 'custom_field', created_at: new Date().toISOString() }],
          }),
      })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ comments: [] }) });

    render(
      <TaskActivityComments taskId="t1" organizationId="org-1" userId="u1" teamMembers={[{ id: 'u1', name: 'Alice' }]} />
    );

    await waitFor(() => {
      expect(screen.getByText(/updated custom_field/i)).toBeInTheDocument();
    });
  });

  it('uses custom task/client/project terms', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            activity: [
              { id: 'a1', user_id: 'u1', kind: 'created', created_at: new Date().toISOString() },
              { id: 'a2', user_id: 'u1', kind: 'client', created_at: new Date().toISOString() },
            ],
          }),
      })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ comments: [] }) });

    render(
      <TaskActivityComments
        taskId="t1"
        organizationId="org-1"
        userId="u1"
        taskTermSingular="Ticket"
        clientTermSingular="Customer"
        projectTermSingular="Job"
        teamMembers={[{ id: 'u1', name: 'Alice' }]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/created this ticket/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/updated the Customer of the ticket/i)).toBeInTheDocument();
  });

  it('uses current user display name when userId matches currentUser', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            activity: [{ id: 'a1', user_id: 'u1', kind: 'created', created_at: new Date().toISOString() }],
          }),
      })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ comments: [] }) });

    render(
      <TaskActivityComments taskId="t1" organizationId="org-1" userId="u1" />
    );

    await waitFor(() => {
      expect(screen.getByText(/created this task/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Test User created this task/)).toBeInTheDocument();
  });

  it('does not fetch when organizationId is missing', async () => {
    render(
      <TaskActivityComments taskId="t1" organizationId="" userId="u1" />
    );
    await waitFor(() => {
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows relative time for activity (Just now, minutes, hours, days ago, date)', async () => {
    const base = new Date('2026-03-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(base);
    const activity = [
      { id: 'a1', user_id: 'u1', kind: 'created', created_at: new Date(base.getTime() - 30 * 1000).toISOString() },
      { id: 'a2', user_id: 'u1', kind: 'status', old_value: 'backlog', new_value: 'to_do', created_at: new Date(base.getTime() - 5 * 60 * 1000).toISOString() },
      { id: 'a3', user_id: 'u1', kind: 'title', created_at: new Date(base.getTime() - 2 * 60 * 60 * 1000).toISOString() },
      { id: 'a4', user_id: 'u1', kind: 'priority', old_value: 'low', new_value: 'high', created_at: new Date(base.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'a5', user_id: 'u1', kind: 'client', created_at: new Date(base.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString() },
    ];
    global.fetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ activity }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ comments: [] }) });

    render(
      <TaskActivityComments taskId="t1" organizationId="org-1" userId="u1" teamMembers={[{ id: 'u1', name: 'Alice' }]} />
    );

    await waitFor(() => {
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });
    expect(screen.getByText('5m ago')).toBeInTheDocument();
    expect(screen.getByText('2h ago')).toBeInTheDocument();
    expect(screen.getByText('3d ago')).toBeInTheDocument();
    expect(screen.getByText(/Feb 21/)).toBeInTheDocument();
    jest.useRealTimers();
  });
});
