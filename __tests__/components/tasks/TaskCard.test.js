/**
 * Unit tests for TaskCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from '@/components/tasks/TaskCard';

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), pathname: '/', query: {} }),
}));

jest.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    isDragging: false,
  }),
}));

describe('TaskCard', () => {
  const defaultTask = {
    id: 'card-1',
    title: 'Card title',
    status: 'to_do',
    priority: 'medium',
    due_at: '2026-03-20T12:00:00Z',
    assignee_id: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders task title and priority', () => {
    render(<TaskCard task={defaultTask} />);
    expect(screen.getByText('Card title')).toBeInTheDocument();
    expect(screen.getByText('Med')).toBeInTheDocument();
  });

  it('renders due date when present', () => {
    render(<TaskCard task={defaultTask} />);
    expect(screen.getByText(/Due /)).toBeInTheDocument();
  });

  it('navigates to edit when card is clicked', () => {
    const { container } = render(<TaskCard task={defaultTask} />);
    const card = screen.getByText('Card title').closest('[role="button"]');
    if (card) fireEvent.click(card);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/tasks/card-1/edit');
  });

  it('calls onStatusChange when Move to is chosen from menu', () => {
    const onStatusChange = jest.fn();
    render(<TaskCard task={defaultTask} onStatusChange={onStatusChange} />);
    const optionsBtn = screen.getByLabelText('Task options');
    fireEvent.click(optionsBtn);
    const moveToDone = screen.getByRole('menuitem', { name: /Move to Completed/i });
    fireEvent.click(moveToDone);
    expect(onStatusChange).toHaveBeenCalledWith(defaultTask, 'done');
  });

  it('calls onDelete when Delete is chosen from menu', () => {
    const onDelete = jest.fn();
    render(<TaskCard task={defaultTask} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Task options'));
    const deleteBtn = screen.getByRole('menuitem', { name: /Delete/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(defaultTask);
  });

  it('renders assignee avatar when assigneeName provided', () => {
    render(
      <TaskCard
        task={{ ...defaultTask, assignee_id: 'u1' }}
        assigneeName="Jane"
      />
    );
    expect(screen.getByTitle('Jane')).toBeInTheDocument();
  });

  it('renders Untitled when task has no title', () => {
    render(<TaskCard task={{ ...defaultTask, title: '' }} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });
});
