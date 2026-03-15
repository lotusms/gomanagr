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

  it('calls onStatusChange when status dropdown change event fires', () => {
    const onStatusChange = jest.fn();
    render(
      <TasksFormHeader
        {...defaultProps}
        onStatusChange={onStatusChange}
      />
    );
    const statusButton = screen.getByLabelText('Status');
    fireEvent.click(statusButton);
    const options = screen.getAllByRole('option');
    if (options.length > 0) {
      fireEvent.click(options[0]);
      expect(onStatusChange).toHaveBeenCalled();
    }
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

  it('renders second row with only Start date when only onStartDateChange provided', () => {
    render(
      <TasksFormHeader
        {...defaultProps}
        startDateValue="2026-03-10"
        onStartDateChange={() => {}}
      />
    );
    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    const startInput = document.getElementById('task-start');
    expect(startInput).toBeInTheDocument();
    expect(startInput.value).toBeTruthy();
    expect(screen.queryByLabelText(/Time to complete/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Priority')).not.toBeInTheDocument();
  });

  it('renders second row with only Time to complete when only onDurationDaysChange provided', () => {
    render(
      <TasksFormHeader
        {...defaultProps}
        durationDaysValue="5"
        onDurationDaysChange={() => {}}
      />
    );
    expect(screen.getByLabelText(/Time to complete/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Priority')).not.toBeInTheDocument();
  });

  it('renders second row with only Priority when only onPriorityChange provided', () => {
    render(
      <TasksFormHeader
        {...defaultProps}
        priorityValue="low"
        onPriorityChange={() => {}}
        priorityOptions={[{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]}
      />
    );
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Time to complete/i)).not.toBeInTheDocument();
  });

  it('calls onStartDateChange with e.target.value when start date changes', () => {
    const onStartDateChange = jest.fn();
    render(
      <TasksFormHeader
        {...defaultProps}
        startDateValue="2026-03-08"
        onStartDateChange={onStartDateChange}
      />
    );
    const startInput = document.getElementById('task-start');
    // DateField calls parent onChange on blur (parsed value), not on input change
    fireEvent.focus(startInput);
    fireEvent.change(startInput, { target: { value: '03/15/2026' } });
    fireEvent.blur(startInput);
    expect(onStartDateChange).toHaveBeenCalledWith('2026-03-15');
  });

  it('renders third row with Assignee when onAssigneeChange and onClientChange provided', () => {
    render(
      <TasksFormHeader
        {...defaultProps}
        onClientChange={() => {}}
        onAssigneeChange={() => {}}
        assigneeValue="u1"
        assigneeOptions={[{ value: 'u1', label: 'Jane' }]}
        clientOptions={[]}
      />
    );
    expect(screen.getByLabelText('Assignee')).toBeInTheDocument();
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
  });

  it('renders third row with only Client when only onClientChange provided', () => {
    render(
      <TasksFormHeader
        {...defaultProps}
        onClientChange={() => {}}
        clientValue="c1"
        clientOptions={[{ value: 'c1', label: 'Acme' }]}
      />
    );
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
    expect(screen.queryByLabelText('Assignee')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Project')).not.toBeInTheDocument();
  });

  it('renders third row with only Project when only onProjectChange provided', () => {
    render(
      <TasksFormHeader
        {...defaultProps}
        onProjectChange={() => {}}
        projectValue="p1"
        projectOptions={[{ value: 'p1', label: 'Alpha' }]}
      />
    );
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.queryByLabelText('Assignee')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Client')).not.toBeInTheDocument();
  });

  it('renders assignee dropdown when assigneeOptions.length > 8 and third row visible', () => {
    const manyOptions = Array.from({ length: 10 }, (_, i) => ({ value: `u${i}`, label: `User ${i}` }));
    render(
      <TasksFormHeader
        {...defaultProps}
        onClientChange={() => {}}
        onAssigneeChange={() => {}}
        assigneeOptions={manyOptions}
      />
    );
    expect(screen.getByLabelText('Assignee')).toBeInTheDocument();
    expect(document.getElementById('task-assignee')).toBeInTheDocument();
  });

  it('renders client and project dropdowns with searchThreshold when options exceed 5', () => {
    const clientOpts = Array.from({ length: 6 }, (_, i) => ({ value: `c${i}`, label: `Client ${i}` }));
    const projectOpts = Array.from({ length: 7 }, (_, i) => ({ value: `p${i}`, label: `Project ${i}` }));
    render(
      <TasksFormHeader
        {...defaultProps}
        onClientChange={() => {}}
        onProjectChange={() => {}}
        clientOptions={clientOpts}
        projectOptions={projectOpts}
      />
    );
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
  });

  it('calls onAssigneeChange when assignee selection changes', () => {
    const onAssigneeChange = jest.fn();
    render(
      <TasksFormHeader
        {...defaultProps}
        onClientChange={() => {}}
        onAssigneeChange={onAssigneeChange}
        assigneeOptions={[{ value: 'u1', label: 'Jane' }, { value: 'u2', label: 'John' }]}
      />
    );
    fireEvent.click(screen.getByLabelText('Assignee'));
    const options = screen.getAllByRole('option');
    if (options.length > 0) fireEvent.click(options[0]);
    expect(onAssigneeChange).toHaveBeenCalled();
  });

  it('calls onClientChange and onProjectChange when third row dropdowns change', () => {
    const onClientChange = jest.fn();
    const onProjectChange = jest.fn();
    render(
      <TasksFormHeader
        {...defaultProps}
        onClientChange={onClientChange}
        onProjectChange={onProjectChange}
        clientOptions={[{ value: 'c1', label: 'Acme' }]}
        projectOptions={[{ value: 'p1', label: 'Proj' }]}
      />
    );
    fireEvent.click(screen.getByLabelText('Client'));
    const clientOptions = screen.getAllByRole('option');
    if (clientOptions.length > 0) {
      fireEvent.click(clientOptions[0]);
      expect(onClientChange).toHaveBeenCalled();
    }
    fireEvent.click(screen.getByLabelText('Project'));
    const projectOptions = screen.getAllByRole('option');
    if (projectOptions.length > 0) {
      fireEvent.click(projectOptions[0]);
      expect(onProjectChange).toHaveBeenCalled();
    }
  });
});
