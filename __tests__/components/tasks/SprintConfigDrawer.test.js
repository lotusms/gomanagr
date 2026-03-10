/**
 * Unit tests for SprintConfigDrawer
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SprintConfigDrawer from '@/components/tasks/SprintConfigDrawer';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {} }),
}));

jest.mock('@/lib/taskSettings', () => ({
  getDefaultTaskSettings: () => ({
    sprintWeeks: 4,
    sprintStartDate: null,
    columns: {},
    statusLabels: {},
    views: {},
    defaultView: 'board',
  }),
  SPRINT_WEEKS_OPTIONS: [2, 3, 4, 5, 6],
  DEFAULT_SPRINT_WEEKS: 4,
}));

describe('SprintConfigDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    orgId: 'org-1',
    userId: 'user-1',
    taskSettings: { sprintWeeks: 4, sprintStartDate: '' },
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders when open with title and Sprint start date field', () => {
    render(<SprintConfigDrawer {...defaultProps} />);
    expect(screen.getByText('Sprint settings')).toBeInTheDocument();
    expect(screen.getByLabelText(/Sprint start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sprint length/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('shows description about Gantt view', () => {
    render(<SprintConfigDrawer {...defaultProps} />);
    expect(screen.getByText(/Configure when the Gantt sprint cycle starts/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    render(<SprintConfigDrawer {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls update-org-task-settings and onSave when Save succeeds', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(<SprintConfigDrawer {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/update-org-task-settings',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        })
      );
    });

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows save error when API returns not ok', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Forbidden' }),
    });
    render(<SprintConfigDrawer {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/Forbidden|Failed/i);
    });
  });

  it('does not save when orgId or userId is missing', async () => {
    render(<SprintConfigDrawer {...defaultProps} orgId={null} userId="user-1" />);
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));
    await Promise.resolve();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('updates sprint start date when user types', async () => {
    render(<SprintConfigDrawer {...defaultProps} />);
    const input = screen.getByLabelText(/Sprint start date/i);
    await userEvent.clear(input);
    await userEvent.type(input, '2026-03-01');
    expect(input).toHaveValue('2026-03-01');
  });
});
