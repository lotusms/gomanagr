/**
 * Unit tests for TaskCalendar
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCalendar from '@/components/tasks/TaskCalendar';

jest.mock('next/link', () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

describe('TaskCalendar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders month label and Today button', () => {
    render(<TaskCalendar tasks={[]} />);
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Today/i })).toBeInTheDocument();
  });

  it('renders weekday headers', () => {
    render(<TaskCalendar tasks={[]} />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders previous and next month buttons', () => {
    render(<TaskCalendar tasks={[]} />);
    expect(screen.getByRole('button', { name: /Previous month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next month/i })).toBeInTheDocument();
  });

  it('navigates to previous month when prev clicked', () => {
    render(<TaskCalendar tasks={[]} />);
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Previous month/i }));
    expect(screen.getByText('February 2026')).toBeInTheDocument();
  });

  it('navigates to next month when next clicked', () => {
    render(<TaskCalendar tasks={[]} />);
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Next month/i }));
    expect(screen.getByText('April 2026')).toBeInTheDocument();
  });

  it('navigates to today when Today clicked', () => {
    render(<TaskCalendar tasks={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Previous month/i }));
    expect(screen.getByText('February 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Today/i }));
    expect(screen.getByText('March 2026')).toBeInTheDocument();
  });

  it('renders single-day task in day cell when task has due_at and duration 1', () => {
    const tasks = [
      {
        id: 't1',
        title: 'Single day task',
        due_at: '2026-03-10T12:00:00Z',
        duration_days: 1,
        assignee_id: null,
      },
    ];
    render(<TaskCalendar tasks={tasks} />);
    expect(screen.getByText('Single day task')).toBeInTheDocument();
  });

  it('renders multi-day task as spanning bar when task has start_date and duration_days', () => {
    const tasks = [
      {
        id: 't2',
        title: 'Multi day task',
        start_date: '2026-03-08',
        duration_days: 3,
        assignee_id: null,
      },
    ];
    render(<TaskCalendar tasks={tasks} />);
    expect(screen.getByText('Multi day task')).toBeInTheDocument();
  });

  it('renders task with assignee name when assigneeNameById provided', () => {
    const tasks = [
      {
        id: 't3',
        title: 'Assigned task',
        due_at: '2026-03-20T12:00:00Z',
        duration_days: 1,
        assignee_id: 'user-1',
      },
    ];
    render(
      <TaskCalendar
        tasks={tasks}
        assigneeNameById={{ 'user-1': 'Jane Doe' }}
      />
    );
    expect(screen.getByText('Assigned task')).toBeInTheDocument();
  });
});
