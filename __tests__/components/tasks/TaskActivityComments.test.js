/**
 * Unit tests for TaskActivityComments:
 * - Shows loading skeleton when loading
 * - Fetches get-task-activity and get-task-comments on mount
 * - Renders empty Activity and Comments when no data
 * - Renders activity list and comment list when data returned
 * - Add comment form: submit calls add-task-comment and appends comment to list
 * - Current user name from auth/account context when not in teamMembers (no "Unknown")
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskActivityComments from '@/components/tasks/TaskActivityComments';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {} }),
}));

const mockUseAuth = jest.fn();
const mockUseOptionalUserAccount = jest.fn();
const mockGetDisplayName = jest.fn();
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));
jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => mockUseOptionalUserAccount(),
  getDisplayName: (account, email) => mockGetDisplayName(account, email),
}));

describe('TaskActivityComments', () => {
  let fetchMock;

  const defaultProps = {
    taskId: 'task-1',
    organizationId: 'org-1',
    userId: 'user-1',
    teamMembers: [{ id: 'user-1', name: 'Jane Doe' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    mockUseAuth.mockReturnValue({ currentUser: null });
    mockUseOptionalUserAccount.mockReturnValue(null);
    mockGetDisplayName.mockImplementation((account, email) => (account ? `${account.firstName || ''} ${account.lastName || ''}`.trim() : email) || '');
  });

  describe('loading', () => {
    it('shows loading state initially then content after fetch', async () => {
      fetchMock.mockImplementation((url) => {
        if (url && url.includes('get-task-activity')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ activity: [] }) });
        }
        if (url && url.includes('get-task-comments')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ comments: [] }) });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<TaskActivityComments {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Activity')).toBeInTheDocument();
      });
      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
      expect(screen.getByText('No comments yet')).toBeInTheDocument();
    });
  });

  describe('with data', () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url) => {
        if (url && url.includes('get-task-activity')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                activity: [
                  {
                    id: 'act-1',
                    kind: 'created',
                    user_id: 'user-1',
                    created_at: new Date().toISOString(),
                  },
                ],
              }),
          });
        }
        if (url && url.includes('get-task-comments')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                comments: [
                  {
                    id: 'com-1',
                    body: 'First comment',
                    user_id: 'user-1',
                    created_at: new Date().toISOString(),
                  },
                ],
              }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
    });

    it('renders activity and comments after fetch', async () => {
      render(<TaskActivityComments {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Jane Doe created this task/i)).toBeInTheDocument();
      });
      expect(screen.getByText('First comment')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Write a comment/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add comment/i })).toBeInTheDocument();
    });
  });

  describe('add comment', () => {
    beforeEach(() => {
      fetchMock.mockImplementation((url, opts) => {
        if (url && url.includes('get-task-activity')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activity: [] }),
          });
        }
        if (url && url.includes('get-task-comments')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ comments: [] }),
          });
        }
        if (url && url.includes('add-task-comment')) {
          const body = JSON.parse(opts?.body || '{}');
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                comment: {
                  id: 'com-new',
                  body: body.body || '',
                  user_id: 'user-1',
                  created_at: new Date().toISOString(),
                },
              }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
    });

    it('calls add-task-comment and shows new comment when form submitted', async () => {
      render(<TaskActivityComments {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Write a comment/i)).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.type(screen.getByPlaceholderText(/Write a comment/i), 'My new comment');
      });
      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: /Add comment/i }).closest('form'));
      });

      await waitFor(() => {
        const addCall = fetchMock.mock.calls.find((c) => String(c[0] || '').includes('add-task-comment'));
        expect(addCall).toBeDefined();
        const body = JSON.parse(addCall[1].body);
        expect(body.taskId).toBe('task-1');
        expect(body.organizationId).toBe('org-1');
        expect(body.userId).toBe('user-1');
        expect(body.body).toBe('My new comment');
      });
      await waitFor(() => {
        expect(screen.getByText('My new comment')).toBeInTheDocument();
      });
    });
  });

  describe('current user display name from context', () => {
    const currentUserId = 'current-user-123';
    const contextDisplayName = 'Alex From Context';

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        currentUser: { uid: currentUserId, email: 'alex@example.com' },
      });
      mockUseOptionalUserAccount.mockReturnValue({
        firstName: 'Alex',
        lastName: 'From Context',
        nameView: 'full',
      });
      mockGetDisplayName.mockReturnValue(contextDisplayName);
      fetchMock.mockImplementation((url, opts) => {
        if (url && url.includes('get-task-activity')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                activity: [
                  {
                    id: 'act-1',
                    kind: 'created',
                    user_id: currentUserId,
                    created_at: new Date().toISOString(),
                  },
                ],
              }),
          });
        }
        if (url && url.includes('get-task-comments')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                comments: [
                  {
                    id: 'com-1',
                    body: 'Comment by current user',
                    user_id: currentUserId,
                    created_at: new Date().toISOString(),
                  },
                ],
              }),
          });
        }
        if (url && url.includes('add-task-comment')) {
          const body = JSON.parse(opts?.body || '{}');
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                comment: {
                  id: 'com-new',
                  body: body.body || '',
                  user_id: currentUserId,
                  created_at: new Date().toISOString(),
                },
              }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
    });

    it('shows current user name from auth/account context when not in teamMembers', async () => {
      const propsWithoutCurrentUserInTeam = {
        taskId: 'task-1',
        organizationId: 'org-1',
        userId: currentUserId,
        teamMembers: [{ id: 'other-user', name: 'Other User' }],
      };

      render(<TaskActivityComments {...propsWithoutCurrentUserInTeam} />);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`${contextDisplayName} created this task`, 'i'))).toBeInTheDocument();
      });
      expect(screen.getByText('Comment by current user')).toBeInTheDocument();
      expect(screen.getByText(contextDisplayName)).toBeInTheDocument();
      expect(screen.queryByText(/Unknown/i)).not.toBeInTheDocument();
    });

    it('shows current user name from email when account is null', async () => {
      mockUseOptionalUserAccount.mockReturnValue(null);
      mockGetDisplayName.mockReturnValue('');

      const propsWithoutCurrentUserInTeam = {
        taskId: 'task-1',
        organizationId: 'org-1',
        userId: currentUserId,
        teamMembers: [],
      };

      render(<TaskActivityComments {...propsWithoutCurrentUserInTeam} />);

      await waitFor(() => {
        expect(screen.getByText(/Activity/)).toBeInTheDocument();
      });
      expect(screen.getByText(/alex@example\.com created this task/i)).toBeInTheDocument();
      expect(screen.queryByText(/Unknown/i)).not.toBeInTheDocument();
    });
  });
});
