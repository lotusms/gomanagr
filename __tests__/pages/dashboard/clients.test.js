/**
 * Unit tests for the Clients page:
 * - Client cards with name and "Added by" when present
 * - Clicking client card navigates to edit page
 * - Deactivated Clients panel toggle and table
 * - Deactivate dialog: CONFIRM word, Deactivate, Delete forever, Cancel
 * - Deactivate sets status inactive; Delete forever removes client
 */

import React from 'react';
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import ClientsPage from '@/pages/dashboard/clients';

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    pathname: '/dashboard/clients',
    query: {},
    asPath: '/dashboard/clients',
  }),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
jest.mock('@/components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user-1', email: 'user@example.com' },
  }),
}));

const mockGetUserAccount = jest.fn();
const mockUpdateClients = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  updateClients: (...args) => mockUpdateClients(...args),
}));

const mockGetUserOrganization = jest.fn();
jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

function setupFetch(orgClients = []) {
  return jest.fn((url, opts = {}) => {
    const path = typeof url === 'string' ? url : opts?.url ?? '';
    const body = opts?.body ? (typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body) : {};
    if (path.includes('get-org-clients')) {
      return Promise.resolve({
        json: () => Promise.resolve({ clients: orgClients, isOrgAdmin: true }),
      });
    }
    if (path.includes('update-org-clients')) {
      const action = body.action;
      const client = body.client;
      const updated = action === 'delete' ? orgClients.filter((c) => c.id !== client?.id) : orgClients.map((c) => (c.id === client?.id ? { ...c, ...client } : c));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ clients: updated }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
}

describe('Clients page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    mockGetUserAccount.mockResolvedValue({ firstName: 'User', clients: [] });
    mockGetUserOrganization.mockResolvedValue({ id: 'org-1', membership: { role: 'admin' } });
  });

  describe('client list and cards', () => {
    it('shows EmptyState when there are no clients', async () => {
      global.fetch = setupFetch([]);

      render(<ClientsPage />);

      await waitFor(() => {
        expect(screen.getByText(/No clients yet/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /add your first client/i })).toBeInTheDocument();
    });

    it('renders client cards with name and Added by when get-org-clients returns clients', async () => {
      const clients = [
        { id: 'c1', name: 'Acme Corp', company: 'Acme Inc', status: 'active', addedByName: 'Jane Doe' },
        { id: 'c2', name: 'Beta LLC', status: 'active' },
      ];
      global.fetch = setupFetch(clients);

      render(<ClientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });
      expect(screen.getByText('Beta LLC')).toBeInTheDocument();
      expect(screen.getByText(/Added by: Jane Doe/)).toBeInTheDocument();
    });

    it('clicking a client card calls router.push to edit page', async () => {
      const clients = [
        { id: 'c1', name: 'Acme Corp', status: 'active' },
      ];
      global.fetch = setupFetch(clients);

      render(<ClientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });

      const cardWrapper = screen.getByRole('button', { name: /acme corp/i });
      await act(async () => {
        cardWrapper.click();
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/edit');
    });
  });

  describe('Deactivated Clients panel', () => {
    it('Deactivated Clients button toggles panel', async () => {
      global.fetch = setupFetch([{ id: 'c1', name: 'Active', status: 'active' }]);

      render(<ClientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      const deactivatedBtn = screen.getByRole('button', { name: /deactivated clients/i });
      expect(deactivatedBtn).toBeInTheDocument();

      await act(async () => {
        deactivatedBtn.click();
      });
      await waitFor(() => {
        expect(screen.getByText('Deactivated clients')).toBeInTheDocument();
      });

      await act(async () => {
        deactivatedBtn.click();
      });
      await waitFor(() => {
        expect(screen.queryByText('Deactivated clients')).not.toBeInTheDocument();
      });
    });

    it('panel shows empty message when no deactivated clients', async () => {
      global.fetch = setupFetch([{ id: 'c1', name: 'Active', status: 'active' }]);

      render(<ClientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      const deactivatedBtn = screen.getByRole('button', { name: /deactivated clients/i });
      await act(async () => {
        deactivatedBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('deactivated-clients-empty')).toBeInTheDocument();
        expect(screen.getByText('No deactivated clients.')).toBeInTheDocument();
      });
    });
  });

  describe('Deactivate client dialog', () => {
    it('opens deactivate dialog with CONFIRM input, Deactivate, Delete forever, and Cancel', async () => {
      const clients = [
        { id: 'c1', name: 'Acme Corp', status: 'active' },
      ];
      global.fetch = setupFetch(clients);

      render(<ClientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });

      const card = screen.getByRole('button', { name: /acme corp/i });
      const removeBtn = within(card).getByRole('button', { name: /deactivate/i });
      await act(async () => {
        removeBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Deactivate client')).toBeInTheDocument();
      expect(within(dialog).getByText(/Acme Corp will be deactivated/)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/type confirm to enable/i)).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /delete forever/i })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /^deactivate$/i })).toBeInTheDocument();
    });

    it('Cancel closes dialog without saving', async () => {
      const clients = [{ id: 'c1', name: 'Acme', status: 'active' }];
      global.fetch = setupFetch(clients);

      render(<ClientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Acme')).toBeInTheDocument();
      });

      const removeBtn = within(screen.getByRole('button', { name: /acme/i })).getByRole('button', { name: /deactivate/i });
      await act(async () => {
        removeBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelBtn = within(screen.getByRole('dialog')).getByRole('button', { name: /^cancel$/i });
      await act(async () => {
        cancelBtn.click();
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      const updateCalls = (global.fetch.mock.calls || []).filter((c) => String(c[0] || '').includes('update-org-clients'));
      expect(updateCalls.length).toBe(0);
    });

    it('Deactivate sets client status to inactive and shows success toast', async () => {
      const clients = [{ id: 'c1', name: 'Acme', status: 'active' }];
      global.fetch = setupFetch(clients);

      render(<ClientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Acme')).toBeInTheDocument();
      });

      const removeBtn = within(screen.getByRole('button', { name: /acme/i })).getByRole('button', { name: /deactivate/i });
      await act(async () => {
        removeBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const confirmInput = within(dialog).getByLabelText(/type confirm to enable/i);
      await act(async () => {
        fireEvent.change(confirmInput, { target: { value: 'CONFIRM' } });
      });
      const deactivateBtn = within(dialog).getByRole('button', { name: /^deactivate$/i });
      await act(async () => {
        deactivateBtn.click();
      });

      await waitFor(() => {
        const updateCalls = (global.fetch.mock.calls || []).filter((c) => {
          const u = c[0];
          const b = c[1]?.body;
          if (!String(u || '').includes('update-org-clients') || !b) return false;
          const parsed = typeof b === 'string' ? JSON.parse(b) : b;
          return parsed.action === 'deactivate';
        });
        expect(updateCalls.length).toBeGreaterThanOrEqual(1);
      });

      expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/deactivated/i));
    });

    it('Delete forever sends delete action and shows success toast', async () => {
      const clients = [{ id: 'c1', name: 'Acme', status: 'active' }];
      global.fetch = setupFetch(clients);

      render(<ClientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Acme')).toBeInTheDocument();
      });

      const removeBtn = within(screen.getByRole('button', { name: /acme/i })).getByRole('button', { name: /deactivate/i });
      await act(async () => {
        removeBtn.click();
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
        const updateCalls = (global.fetch.mock.calls || []).filter((c) => {
          const u = c[0];
          const b = c[1]?.body;
          if (!String(u || '').includes('update-org-clients') || !b) return false;
          const parsed = typeof b === 'string' ? JSON.parse(b) : b;
          return parsed.action === 'delete';
        });
        expect(updateCalls.length).toBeGreaterThanOrEqual(1);
      });

      expect(mockToast.success).toHaveBeenCalledWith('Client permanently deleted.', 5000);
    });
  });

  describe('solo user (no org)', () => {
    it('loads clients from user account when not in org', async () => {
      mockGetUserOrganization.mockResolvedValue(null);
      mockGetUserAccount.mockResolvedValue({
        firstName: 'User',
        clients: [
          { id: 'c1', name: 'Solo Client', status: 'active' },
        ],
      });
      global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }));

      render(<ClientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Solo Client')).toBeInTheDocument();
      });

      expect(mockGetUserAccount).toHaveBeenCalledWith('user-1');
    });
  });
});
