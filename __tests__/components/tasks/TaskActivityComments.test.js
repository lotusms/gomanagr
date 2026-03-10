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
});
