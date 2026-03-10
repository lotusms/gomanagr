/**
 * Unit tests for TasksFormHeader:
 * - Renders title, document ID, status in first row
 * - When due date/priority/assignee handlers passed, renders second row
 * - When client/project handlers passed, renders third row
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders second row with Start date, Time to complete, Priority, Assignee when handlers provided', () => {
    render(
      <TasksFormHeader
        {...defaultProps}
        startDateValue="2026-03-08"
        onStartDateChange={() => {}}
        durationDaysValue="3"
        onDurationDaysChange={() => {}}
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
        onClientChange={() => {}}
        onProjectChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    expect(screen.getByLabelText(/Time to complete/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Assignee')).toBeInTheDocument();
  });

  it('renders third row with Client and Project when handlers provided', () => {
    render(
      <TasksFormHeader
        {...defaultProps}
        onStartDateChange={() => {}}
        onDurationDaysChange={() => {}}
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

  it('calls onDurationDaysChange when time to complete changes', () => {
    const onDurationDaysChange = jest.fn();
    render(
      <TasksFormHeader
        {...defaultProps}
        durationDaysValue="3"
        onDurationDaysChange={onDurationDaysChange}
        onClientChange={() => {}}
        onProjectChange={() => {}}
      />
    );
    const durationInput = screen.getByLabelText(/Time to complete/i);
    fireEvent.change(durationInput, { target: { value: '5' } });
    expect(onDurationDaysChange).toHaveBeenCalled();
  });

  it('calls onPriorityChange when priority dropdown change event fires', () => {
    const onPriorityChange = jest.fn();
    render(
      <TasksFormHeader
        {...defaultProps}
        priorityValue="high"
        onPriorityChange={onPriorityChange}
        priorityOptions={[
          { value: 'low', label: 'Low' },
          { value: 'high', label: 'High' },
        ]}
        onClientChange={() => {}}
        onProjectChange={() => {}}
      />
    );
    const priorityButton = screen.getByLabelText('Priority');
    expect(priorityButton).toBeInTheDocument();
    fireEvent.click(priorityButton);
    const options = screen.getAllByRole('option');
    if (options.length > 0) {
      fireEvent.click(options[0]);
      expect(onPriorityChange).toHaveBeenCalled();
    }
  });
});
