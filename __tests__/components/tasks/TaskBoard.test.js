/**
 * Unit tests for TaskBoard
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

jest.mock('@dnd-kit/core', () => {
  const React = require('react');
  const actual = jest.requireActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: function MockDndContext(props) {
      React.useEffect(() => {
        window.__taskBoardOnDragEnd = props.onDragEnd;
        return () => { delete window.__taskBoardOnDragEnd; };
      }, [props.onDragEnd]);
      return React.createElement(actual.DndContext, props);
    },
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

  it('handles tasks with status not in TASK_STATUSES without crashing', () => {
    const tasks = [
      { id: 't1', title: 'Orphan', status: 'custom_status', priority: 'medium', assignee_id: null },
    ];
    render(<TaskBoard tasks={tasks} />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
  });

  it('passes assigneeNameById and assigneePhotoById to columns', () => {
    const tasks = [
      { id: 't1', title: 'Task', status: 'backlog', priority: 'medium', assignee_id: 'u1' },
    ];
    const assigneeNameById = { u1: 'Alice' };
    render(<TaskBoard tasks={tasks} assigneeNameById={assigneeNameById} />);
    expect(screen.getByText('Task')).toBeInTheDocument();
  });

  it('calls onStatusChange when drag ends over different status column', async () => {
    const onStatusChange = jest.fn();
    const tasks = [
      { id: 't1', title: 'Move me', status: 'backlog', priority: 'medium', assignee_id: null, position: 0 },
    ];
    render(<TaskBoard tasks={tasks} onStatusChange={onStatusChange} />);
    await waitFor(() => {
      expect(window.__taskBoardOnDragEnd).toBeDefined();
    });
    const onDragEnd = window.__taskBoardOnDragEnd;
    await act(() => {
      onDragEnd({
        active: { id: 't1', data: { current: { taskId: 't1' } } },
        over: { id: 'to_do' },
      });
    });
    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', status: 'backlog' }),
      'to_do'
    );
  });
});
