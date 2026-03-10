/**
 * Unit tests for TaskGantt
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskGantt from '@/components/tasks/TaskGantt';

jest.mock('next/link', () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

describe('TaskGantt', () => {
  it('renders sprint header with weeks and scroll buttons', () => {
    render(<TaskGantt tasks={[]} />);
    expect(screen.getByText(/Sprint:.*week.*One column = 1 day/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scroll left/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scroll right/i })).toBeInTheDocument();
  });

  it('renders Task label and empty state when no tasks in range', () => {
    render(<TaskGantt tasks={[]} />);
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText(/No tasks with due date in this sprint/i)).toBeInTheDocument();
  });

  it('uses taskTermSingular and taskTermPlural when provided', () => {
    render(
      <TaskGantt
        tasks={[]}
        taskTermSingular="Issue"
        taskTermPlural="issues"
      />
    );
    expect(screen.getByText('Issue')).toBeInTheDocument();
    expect(screen.getByText(/No issues with due date in this sprint/i)).toBeInTheDocument();
  });

  it('renders task in timeline when task has start_date and duration in sprint range', () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay() + 1);
    const startStr = start.toISOString().slice(0, 10);
    const tasks = [
      {
        id: 'g1',
        title: 'Gantt task',
        start_date: startStr,
        duration_days: 2,
        assignee_id: null,
      },
    ];
    render(<TaskGantt tasks={tasks} sprintStartDate={startStr} />);
    expect(screen.getByText('Gantt task')).toBeInTheDocument();
  });

  it('scroll buttons do not throw', () => {
    render(<TaskGantt tasks={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Scroll left/i }));
    fireEvent.click(screen.getByRole('button', { name: /Scroll right/i }));
  });
});
