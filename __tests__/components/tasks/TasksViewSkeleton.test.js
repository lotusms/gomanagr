/**
 * Unit tests for TasksViewSkeleton
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import TasksViewSkeleton from '@/components/tasks/TasksViewSkeleton';

describe('TasksViewSkeleton', () => {
  it('renders board skeleton by default', () => {
    render(<TasksViewSkeleton />);
    expect(screen.getByTestId('tasks-board-skeleton')).toBeInTheDocument();
  });

  it('renders board skeleton when view is board', () => {
    render(<TasksViewSkeleton view="board" />);
    expect(screen.getByTestId('tasks-board-skeleton')).toBeInTheDocument();
  });

  it('renders list skeleton when view is list', () => {
    render(<TasksViewSkeleton view="list" />);
    expect(screen.getByTestId('tasks-list-skeleton')).toBeInTheDocument();
  });

  it('renders calendar skeleton when view is calendar', () => {
    render(<TasksViewSkeleton view="calendar" />);
    expect(screen.getByTestId('tasks-calendar-skeleton')).toBeInTheDocument();
  });

  it('renders gantt skeleton when view is gantt', () => {
    render(<TasksViewSkeleton view="gantt" />);
    expect(screen.getByTestId('tasks-gantt-skeleton')).toBeInTheDocument();
  });
});
