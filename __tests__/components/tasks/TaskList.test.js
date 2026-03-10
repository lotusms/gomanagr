/**
 * Unit tests for TaskList
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskList from '@/components/tasks/TaskList';

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), pathname: '/', query: {} }),
}));

describe('TaskList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with Tasks aria label', () => {
    render(<TaskList tasks={[]} />);
    expect(screen.getByRole('table', { name: /Tasks/i })).toBeInTheDocument();
  });

  it('renders column headers for assignee, title, client, status, priority, due date', () => {
    render(<TaskList tasks={[]} />);
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Due date')).toBeInTheDocument();
  });

  it('renders task row with title and navigates on click', () => {
    const tasks = [
      {
        id: 'task-1',
        title: 'My first task',
        status: 'to_do',
        priority: 'medium',
        assignee_id: null,
        client_id: null,
        due_at: null,
      },
    ];
    render(<TaskList tasks={tasks} />);
    expect(screen.getByText('My first task')).toBeInTheDocument();
    fireEvent.click(screen.getByText('My first task'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/tasks/task-1/edit');
  });

  it('renders assignee name when assigneeNameById provided', () => {
    const tasks = [
      {
        id: 'task-2',
        title: 'Task with assignee',
        status: 'in_progress',
        priority: 'high',
        assignee_id: 'user-1',
        client_id: null,
        due_at: null,
      },
    ];
    render(
      <TaskList
        tasks={tasks}
        assigneeNameById={{ 'user-1': 'Jane Doe' }}
      />
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Task with assignee')).toBeInTheDocument();
  });

  it('respects columnsConfig and hides columns when false', () => {
    render(
      <TaskList
        tasks={[]}
        columnsConfig={{
          assignee: true,
          title: true,
          client: false,
          status: true,
          priority: false,
          due_at: true,
        }}
      />
    );
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Due date')).toBeInTheDocument();
    expect(screen.queryByText('Client')).not.toBeInTheDocument();
    expect(screen.queryByText('Priority')).not.toBeInTheDocument();
  });

  it('uses statusLabels override when provided', () => {
    const tasks = [
      {
        id: 'task-3',
        title: 'Backlog task',
        status: 'backlog',
        priority: 'low',
        assignee_id: null,
        client_id: null,
        due_at: null,
      },
    ];
    render(
      <TaskList
        tasks={tasks}
        statusLabels={{ backlog: 'To Do Later' }}
      />
    );
    expect(screen.getByText('To Do Later')).toBeInTheDocument();
  });
});
