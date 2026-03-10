/**
 * Unit tests for TaskBoard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskBoard from '@/components/tasks/TaskBoard';

jest.mock('@/components/tasks/TaskCard', () => {
  return function MockTaskCard({ task, onStatusChange, onDelete, onAddTask }) {
    return (
      <div data-testid={`task-card-${task.id}`}>
        <span>{task.title}</span>
        {onDelete && (
          <button type="button" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}>
            Delete
          </button>
        )}
      </div>
    );
  };
});

describe('TaskBoard', () => {
  it('renders column headers for all statuses', () => {
    render(<TaskBoard tasks={[]} />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('To do')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders Add a card button in each column', () => {
    render(<TaskBoard tasks={[]} />);
    const addButtons = screen.getAllByRole('button', { name: /Add a card/i });
    expect(addButtons.length).toBe(5);
  });

  it('calls onAddTask with status when Add a card clicked', () => {
    const onAddTask = jest.fn();
    render(<TaskBoard tasks={[]} onAddTask={onAddTask} />);
    const addButtons = screen.getAllByRole('button', { name: /Add a card/i });
    fireEvent.click(addButtons[0]);
    expect(onAddTask).toHaveBeenCalledWith('backlog');
  });

  it('renders tasks in correct status columns', () => {
    const tasks = [
      { id: 't1', title: 'Backlog task', status: 'backlog', priority: 'medium', assignee_id: null },
      { id: 't2', title: 'To do task', status: 'to_do', priority: 'low', assignee_id: null },
    ];
    render(<TaskBoard tasks={tasks} />);
    expect(screen.getByText('Backlog task')).toBeInTheDocument();
    expect(screen.getByText('To do task')).toBeInTheDocument();
  });

  it('uses custom statusLabels when provided', () => {
    render(
      <TaskBoard
        tasks={[]}
        statusLabels={{
          backlog: 'Icebox',
          to_do: 'Ready',
          in_progress: 'Doing',
          blocked: 'Stuck',
          done: 'Done',
        }}
      />
    );
    expect(screen.getByText('Icebox')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Doing')).toBeInTheDocument();
    expect(screen.getByText('Stuck')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
