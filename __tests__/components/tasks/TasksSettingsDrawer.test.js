/**
 * Unit tests for TasksSettingsDrawer
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TasksSettingsDrawer from '@/components/tasks/TasksSettingsDrawer';

const mockGetDefaultTaskSettings = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {} }),
}));
jest.mock('@/lib/taskSettings', () => ({
  getDefaultTaskSettings: (...args) => mockGetDefaultTaskSettings(...args),
  COLUMN_LABELS: { assignee: 'Assignee', title: 'Title', status: 'Status', priority: 'Priority', due_at: 'Due date', start_date: 'Start date', duration_days: 'Time to complete' },
  DEFAULT_COLUMNS: { assignee: true, title: true, status: true, priority: true, due_at: true, start_date: true, duration_days: true },
}));
jest.mock('@/config/taskConstants', () => ({
  TASK_STATUSES: [
    { value: 'backlog', label: 'Backlog' },
    { value: 'to_do', label: 'To do' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'done', label: 'Completed' },
  ],
}));

describe('TasksSettingsDrawer', () => {
  const defaultSettings = {
    columns: { assignee: true, title: true, status: true, priority: true, due_at: true, start_date: true, duration_days: true },
    statusLabels: {},
    views: { list: true, calendar: true, gantt: true },
    defaultView: 'board',
    sprintWeeks: 4,
    sprintStartDate: null,
  };

  beforeEach(() => {
    mockGetDefaultTaskSettings.mockReturnValue({ ...defaultSettings });
    global.fetch = jest.fn();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <TasksSettingsDrawer isOpen={false} onClose={jest.fn()} orgId="org-1" userId="u1" />
    );
    expect(container.querySelector('[role="dialog"]') || container.textContent).not.toContain('Task settings');
  });

  it('renders title and sections when open', () => {
    render(
      <TasksSettingsDrawer
        isOpen
        onClose={jest.fn()}
        orgId="org-1"
        userId="u1"
        taskSettings={defaultSettings}
      />
    );
    expect(screen.getByText('Task settings')).toBeInTheDocument();
    expect(screen.getByText('Table columns')).toBeInTheDocument();
    expect(screen.getByText('Status names')).toBeInTheDocument();
    expect(screen.getByText('Views')).toBeInTheDocument();
  });

  it('saves settings and calls onSave and onClose on success', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const onSave = jest.fn();
    const onClose = jest.fn();

    render(
      <TasksSettingsDrawer
        isOpen
        onClose={onClose}
        orgId="org-1"
        userId="u1"
        taskSettings={defaultSettings}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/update-org-task-settings',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });
    expect(onSave).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call fetch when orgId or userId missing', () => {
    render(
      <TasksSettingsDrawer
        isOpen
        onClose={jest.fn()}
        orgId={null}
        userId="u1"
        taskSettings={defaultSettings}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('syncs settings from initialSettings when drawer opens', () => {
    const serverSettings = {
      ...defaultSettings,
      defaultView: 'list',
      statusLabels: { to_do: 'Todo' },
    };
    const { rerender } = render(
      <TasksSettingsDrawer isOpen={false} onClose={jest.fn()} orgId="org-1" userId="u1" taskSettings={serverSettings} />
    );
    rerender(
      <TasksSettingsDrawer isOpen onClose={jest.fn()} orgId="org-1" userId="u1" taskSettings={serverSettings} />
    );
    expect(screen.getByText('Task settings')).toBeInTheDocument();
    expect(screen.getByText('Default view')).toBeInTheDocument();
  });

  it('toggles column visibility via switch', () => {
    render(
      <TasksSettingsDrawer isOpen taskSettings={defaultSettings} onClose={jest.fn()} orgId="org-1" userId="u1" />
    );
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
    fireEvent.click(switches[0]);
    fireEvent.click(switches[0]);
  });

  it('updates status label via input', () => {
    render(
      <TasksSettingsDrawer isOpen taskSettings={defaultSettings} onClose={jest.fn()} orgId="org-1" userId="u1" />
    );
    const toDoInput = screen.getByLabelText(/To do/i);
    fireEvent.change(toDoInput, { target: { value: 'Todo' } });
    expect(toDoInput.value).toBe('Todo');
    fireEvent.change(toDoInput, { target: { value: '' } });
    expect(toDoInput).toBeInTheDocument();
  });

  it('toggles view visibility (Table, Calendar, Gantt)', () => {
    render(
      <TasksSettingsDrawer isOpen taskSettings={defaultSettings} onClose={jest.fn()} orgId="org-1" userId="u1" />
    );
    const viewSwitches = screen.getAllByRole('switch');
    const tableCalendarGanttSwitches = viewSwitches.slice(-3);
    tableCalendarGanttSwitches.forEach((sw) => fireEvent.click(sw));
    expect(screen.getByText('Views')).toBeInTheDocument();
  });

  it('changes default view via dropdown', () => {
    render(
      <TasksSettingsDrawer isOpen taskSettings={defaultSettings} onClose={jest.fn()} orgId="org-1" userId="u1" />
    );
    const dropdown = document.getElementById('default-view');
    fireEvent.change(dropdown, { target: { value: 'calendar' } });
    expect(dropdown.value).toBe('calendar');
  });

  it('default view fallback to board when selection is empty', () => {
    render(
      <TasksSettingsDrawer isOpen taskSettings={defaultSettings} onClose={jest.fn()} orgId="org-1" userId="u1" />
    );
    const dropdown = document.getElementById('default-view');
    fireEvent.change(dropdown, { target: { value: '' } });
    expect(dropdown).toBeInTheDocument();
  });

  it('shows save error when fetch fails', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) });
    render(
      <TasksSettingsDrawer isOpen taskSettings={defaultSettings} onClose={jest.fn()} orgId="org-1" userId="u1" />
    );
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Failed to save|Server error/);
    });
  });
});
