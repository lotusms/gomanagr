/**
 * Unit tests for the Deactivate member dialog: layout (Delete forever, Cancel, Deactivate),
 * Cancel closes without action, Deactivate sets status inactive, Delete forever removes member.
 */

import React from 'react';
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import TeamPage from '@/pages/dashboard/team';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard/team',
    query: {},
    asPath: '/dashboard/team',
  }),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
jest.mock('@/components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'admin-uid', email: 'admin@example.com' },
  }),
}));

const mockGetUserAccount = jest.fn();
const mockUpdateTeamMembers = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  updateTeamMembers: (...args) => mockUpdateTeamMembers(...args),
  updateServices: jest.fn(),
  uploadTeamPhoto: jest.fn(),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

const mockGetUserOrganization = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      send: jest.fn(),
      unsubscribe: () => {},
    }),
  },
}));

function setupFetch() {
  return jest.fn((url) => {
    const path = typeof url === 'string' ? url : url?.url ?? '';
    if (path.includes('get-org-members')) {
      return Promise.resolve({ json: () => Promise.resolve({ members: [] }) });
    }
    if (path.includes('get-org-invites')) {
      return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
}

describe('Team page – Deactivate / Delete member dialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    mockGetUserAccount.mockResolvedValue({
      teamMembers: [{ id: 'm-jane', name: 'Jane Doe', email: 'jane@example.com', role: 'Stylist' }],
      firstName: 'Admin',
    });
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'admin' },
    });
    mockUpdateTeamMembers.mockResolvedValue(undefined);
    global.fetch = setupFetch();
  });

  it('opens dialog with title, message, and three actions: Delete forever, Cancel, Deactivate', async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /jane doe/i });
    const deactivateBtn = within(card).getByRole('button', { name: /deactivate/i });
    await act(async () => {
      deactivateBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Deactivate member')).toBeInTheDocument();
    expect(within(dialog).getByText(/Jane Doe will be deactivated/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/type confirm to enable/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /delete forever/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^deactivate$/i })).toBeInTheDocument();
  });

  it('Cancel closes dialog and does not call updateTeamMembers', async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /jane doe/i });
    const deactivateBtn = within(card).getByRole('button', { name: /deactivate/i });
    await act(async () => {
      deactivateBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const cancelBtn = within(dialog).getByRole('button', { name: /^cancel$/i });
    await act(async () => {
      cancelBtn.click();
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(mockUpdateTeamMembers).not.toHaveBeenCalled();
  });

  it('Deactivate sets member status to inactive and shows success toast', async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /jane doe/i });
    const deactivateBtn = within(card).getByRole('button', { name: /deactivate/i });
    await act(async () => {
      deactivateBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const confirmInput = within(dialog).getByLabelText(/type confirm to enable/i);
    await act(async () => {
      fireEvent.change(confirmInput, { target: { value: 'CONFIRM' } });
    });
    const deactivateConfirmBtn = within(dialog).getByRole('button', { name: /^deactivate$/i });
    await act(async () => {
      deactivateConfirmBtn.click();
    });

    await waitFor(() => {
      expect(mockUpdateTeamMembers).toHaveBeenCalled();
    });

    const savedTeam = mockUpdateTeamMembers.mock.calls[0][1];
    const jane = savedTeam.find((m) => m.id === 'm-jane');
    expect(jane).toBeDefined();
    expect(jane.status).toBe('inactive');
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/deactivated/i), 5000);
  });

  it('Delete forever removes member from team and shows success toast', async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /jane doe/i });
    const deactivateBtn = within(card).getByRole('button', { name: /deactivate/i });
    await act(async () => {
      deactivateBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const confirmInput = within(dialog).getByLabelText(/type confirm to enable/i);
    await act(async () => {
      fireEvent.change(confirmInput, { target: { value: 'CONFIRM' } });
    });
    const deleteForeverBtn = within(dialog).getByRole('button', { name: /delete forever/i });
    await act(async () => {
      deleteForeverBtn.click();
    });

    await waitFor(() => {
      expect(mockUpdateTeamMembers).toHaveBeenCalled();
    });

    const savedTeam = mockUpdateTeamMembers.mock.calls[0][1];
    const jane = savedTeam.find((m) => m.id === 'm-jane');
    expect(jane).toBeUndefined();
    expect(savedTeam.length).toBe(0);
    expect(mockToast.success).toHaveBeenCalledWith('Member permanently deleted.', 5000);
  });

  it('dialog closes after Delete forever completes', async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /jane doe/i });
    const deactivateBtn = within(card).getByRole('button', { name: /deactivate/i });
    await act(async () => {
      deactivateBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const confirmInput = within(dialog).getByLabelText(/type confirm to enable/i);
    await act(async () => {
      fireEvent.change(confirmInput, { target: { value: 'CONFIRM' } });
    });
    const deleteForeverBtn = within(dialog).getByRole('button', { name: /delete forever/i });
    await act(async () => {
      deleteForeverBtn.click();
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
