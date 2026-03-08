/**
 * Unit tests for TasksFormHeader:
 * - Renders title, document ID, status in first row
 * - When due date/priority/assignee handlers passed, renders second row
 * - When client/project handlers passed, renders third row
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TasksFormHeader from '@/components/ui/TasksFormHeader';

describe('TasksFormHeader', () => {
  const defaultProps = {
    idPrefix: 'task',
    titleLabel: 'Task title',
    titleValue: 'My task',
    titlePlaceholder: 'Enter title',
    onTitleChange: () => {},
    documentIdLabel: 'Task ID',
    documentIdValue: 'TASK-001',
    documentIdPlaceholder: 'Auto',
    onDocumentIdChange: () => {},
    statusLabel: 'Status',
    statusValue: 'to_do',
    statusOptions: [
      { value: 'backlog', label: 'Backlog' },
      { value: 'to_do', label: 'To do' },
      { value: 'done', label: 'Done' },
    ],
    onStatusChange: () => {},
  };

  it('renders title, document ID, and status fields', () => {
    render(<TasksFormHeader {...defaultProps} />);

    expect(screen.getByLabelText('Task title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My task')).toBeInTheDocument();
    expect(screen.getByLabelText('Task ID')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TASK-001')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('renders second row with Due date, Priority, Assignee when handlers provided', () => {
    render(
      <TasksFormHeader
        {...defaultProps}
        dueDateValue="2026-03-10"
        onDueDateChange={() => {}}
        dueDateLabel="Due date"
        priorityValue="high"
        onPriorityChange={() => {}}
        priorityOptions={[
          { value: 'low', label: 'Low' },
          { value: 'high', label: 'High' },
        ]}
        assigneeValue=""
        onAssigneeChange={() => {}}
        assigneeOptions={[{ value: 'u1', label: 'Jane' }]}
        assigneeLabel="Assignee"
      />
    );

    expect(screen.getByLabelText('Due date')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Assignee')).toBeInTheDocument();
  });

  it('renders third row with Client and Project when handlers provided', () => {
    render(
      <TasksFormHeader
        {...defaultProps}
        onDueDateChange={() => {}}
        onPriorityChange={() => {}}
        onAssigneeChange={() => {}}
        clientValue=""
        onClientChange={() => {}}
        clientOptions={[{ value: 'c1', label: 'Acme' }]}
        clientLabel="Client"
        projectValue=""
        onProjectChange={() => {}}
        projectOptions={[{ value: 'p1', label: 'Project Alpha' }]}
        projectLabel="Project"
      />
    );

    expect(screen.getByLabelText('Client')).toBeInTheDocument();
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
  });

  it('calls onTitleChange when title input changes', async () => {
    const onTitleChange = jest.fn();
    render(<TasksFormHeader {...defaultProps} onTitleChange={onTitleChange} />);

    await userEvent.clear(screen.getByLabelText('Task title'));
    await userEvent.type(screen.getByLabelText('Task title'), 'Updated');

    expect(onTitleChange).toHaveBeenCalled();
  });
});
