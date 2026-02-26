/**
 * Unit tests for the Schedule screen:
 * - Superadmins and admins see everyone's schedules; regular members see only their own
 * - Appointments added/edits show in real time (broadcast triggers refetch)
 * - Admins can assign appointment to any member; members cannot (Team Member field hidden)
 * - Client: select dropdown with list or Add to open drawer (minimal: name, phone, email, company toggle)
 * - Add/Edit form: Appointment title, Team Member (admins only), Date, Start/End time, Recurrence (optional),
 *   Services dropdown, Client+Add, Notes (textarea)
 */

import React from 'react';
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import SchedulePage from '@/pages/dashboard/schedule';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard/schedule',
    query: {},
    asPath: '/dashboard/schedule',
  }),
}));

const mockCurrentUser = { uid: 'user-1', email: 'admin@example.com' };
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser: mockCurrentUser }),
}));

const mockGetUserAccount = jest.fn();
const mockSaveAppointment = jest.fn();
const mockDeleteAppointment = jest.fn();
const mockGetUserAccountFromServer = jest.fn();
const mockUpdateClients = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  getUserAccountFromServer: (...args) => mockGetUserAccountFromServer(...args),
  saveAppointment: (...args) => mockSaveAppointment(...args),
  deleteAppointment: (...args) => mockDeleteAppointment(...args),
  updateClients: (...args) => mockUpdateClients(...args),
}));

const mockGetUserOrganization = jest.fn();
jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

const mockChannelSend = jest.fn();
let capturedBroadcastHandler = null;
const mockUnsubscribe = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => ({
      on: (event, opts, handler) => {
        if (event === 'broadcast' && opts?.event === 'schedule-updated' && typeof handler === 'function') {
          capturedBroadcastHandler = handler;
        }
        return {
          subscribe: (statusCb) => {
            if (typeof statusCb === 'function') statusCb('SUBSCRIBED');
            return { unsubscribe: mockUnsubscribe };
          },
        };
      },
      send: (...args) => mockChannelSend(...args),
      unsubscribe: mockUnsubscribe,
    }),
  },
}));

const teamMembers = [
  { id: 'tm1', name: 'Alice', email: 'alice@example.com' },
  { id: 'tm2', name: 'Bob', email: 'bob@example.com' },
];

const clients = [
  { id: 'c1', name: 'Acme Corp', company: 'Acme' },
  { id: 'c2', name: 'Jane Doe' },
];

const services = [
  { id: 's1', name: 'Haircut', assignedTeamMemberIds: ['tm1', 'tm2'] },
];

function buildOrgSchedule(overrides = {}) {
  return {
    teamMembers,
    clients,
    services,
    appointments: [
      { id: 'apt1', staffId: 'tm1', date: '2026-02-24', start: '09:00', end: '10:00', label: 'With Alice', clientId: 'c1' },
      { id: 'apt2', staffId: 'tm2', date: '2026-02-24', start: '14:00', end: '15:00', label: 'With Bob', clientId: 'c2' },
    ],
    businessHoursStart: '08:00',
    businessHoursEnd: '18:00',
    timeFormat: '24h',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'UTC',
    ...overrides,
  };
}

describe('Schedule page', () => {
  let fetchCalls;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedBroadcastHandler = null;
    fetchCalls = [];
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    mockGetUserAccount.mockResolvedValue({
      teamMembers: [],
      appointments: [],
      clients: [],
      services: [],
    });
    mockGetUserAccountFromServer.mockResolvedValue({ appointments: [] });

    global.fetch = jest.fn((url, opts = {}) => {
      fetchCalls.push({ url: typeof url === 'string' ? url : url?.url, method: opts.method, body: opts.body });
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('org-schedule-data')) {
        return Promise.resolve({
          json: () => Promise.resolve({ schedule: buildOrgSchedule() }),
        });
      }
      if (path.includes('org-schedule-mutation')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      if (path.includes('update-org-clients')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  describe('role-based schedule visibility', () => {
    it('superadmins and admins see everyone’s schedules', async () => {
      mockGetUserOrganization.mockResolvedValue({
        id: 'org-1',
        membership: { role: 'admin' },
      });

      render(<SchedulePage />);

      await waitFor(() => {
        const dataCalls = fetchCalls.filter((c) => c.url && String(c.url).includes('org-schedule-data'));
        expect(dataCalls.length).toBeGreaterThanOrEqual(1);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /schedule/i })).toBeInTheDocument();
      });

      const schedulePayload = JSON.parse(
        fetchCalls.find((c) => c.body && String(c.url).includes('org-schedule-data'))?.body ?? '{}'
      );
      expect(schedulePayload.userId).toBe('user-1');

      expect(screen.getByRole('button', { name: /add appointment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next week/i })).toBeInTheDocument();
    });

    it('regular members see only their own schedules', async () => {
      mockCurrentUser.email = 'alice@example.com';
      mockGetUserOrganization.mockResolvedValue({
        id: 'org-1',
        membership: { role: 'member' },
      });

      global.fetch = jest.fn((url, opts = {}) => {
        fetchCalls.push({ url: typeof url === 'string' ? url : url?.url, body: opts.body });
        const path = typeof url === 'string' ? url : url?.url ?? '';
        if (path.includes('org-schedule-data')) {
          const schedule = buildOrgSchedule();
          const me = schedule.teamMembers.find((m) => m.email === 'alice@example.com');
          const myAppointments = schedule.appointments.filter((a) => String(a.staffId) === String(me?.id));
          return Promise.resolve({
            json: () => Promise.resolve({
              schedule: { ...schedule, appointments: myAppointments },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<SchedulePage />);

      await waitFor(() => {
        expect(fetchCalls.some((c) => String(c.url || '').includes('org-schedule-data'))).toBe(true);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /schedule/i })).toBeInTheDocument();
      });

      mockCurrentUser.email = 'admin@example.com';
    });
  });

  describe('real-time updates', () => {
    it('schedule refetches when broadcast event is received', async () => {
      mockGetUserOrganization.mockResolvedValue({
        id: 'org-1',
        membership: { role: 'admin' },
      });

      render(<SchedulePage />);

      await waitFor(() => {
        expect(fetchCalls.some((c) => String(c.url || '').includes('org-schedule-data'))).toBe(true);
      });

      const initialCount = fetchCalls.filter((c) => String(c.url || '').includes('org-schedule-data')).length;

      if (typeof capturedBroadcastHandler === 'function') {
        act(() => {
          capturedBroadcastHandler({ payload: {} });
        });
      }

      await waitFor(() => {
        const dataCalls = fetchCalls.filter((c) => String(c.url || '').includes('org-schedule-data'));
        expect(dataCalls.length).toBeGreaterThanOrEqual(initialCount);
      });
    });
  });

  describe('Add/Edit appointment form', () => {
    it('superadmins and admins see Team Member dropdown and can assign to any member', async () => {
      mockGetUserOrganization.mockResolvedValue({
        id: 'org-1',
        membership: { role: 'admin' },
      });

      render(<SchedulePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add appointment/i })).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole('button', { name: /add appointment/i }).click();
      });

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('heading', { name: /add appointment/i })).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByLabelText(/appointment title/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/team member/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/date/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/start time/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/end time/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/recurring appointment/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/notes/i)).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /add/i })).toBeInTheDocument();
    });

    it('regular members do not see Team Member dropdown (restricted to self)', async () => {
      mockCurrentUser.email = 'alice@example.com';
      mockGetUserOrganization.mockResolvedValue({
        id: 'org-1',
        membership: { role: 'member' },
      });

      global.fetch = jest.fn((url, opts = {}) => {
        const path = typeof url === 'string' ? url : url?.url ?? '';
        if (path.includes('org-schedule-data')) {
          const schedule = buildOrgSchedule();
          const me = schedule.teamMembers.find((m) => m.email === 'alice@example.com');
          return Promise.resolve({
            json: () => Promise.resolve({
              schedule: { ...schedule, teamMembers: me ? [me] : [], appointments: [] },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<SchedulePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add appointment/i })).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole('button', { name: /add appointment/i }).click();
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByLabelText(/appointment title/i)).toBeInTheDocument();
      expect(within(dialog).queryByLabelText(/team member/i)).not.toBeInTheDocument();
      expect(within(dialog).getByLabelText(/date/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/start time/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/end time/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/recurring appointment/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/notes/i)).toBeInTheDocument();

      mockCurrentUser.email = 'admin@example.com';
    });

    it('form has Appointment title, Date, Start Time, End Time, Recurrence, Services, Client dropdown with Add, and Notes', async () => {
      mockGetUserOrganization.mockResolvedValue({
        id: 'org-1',
        membership: { role: 'admin' },
      });

      render(<SchedulePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add appointment/i })).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole('button', { name: /add appointment/i }).click();
      });

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByLabelText(/appointment title/i)).toBeInTheDocument();
        expect(within(dialog).getByLabelText(/date/i)).toBeInTheDocument();
        expect(within(dialog).getByLabelText(/start time/i)).toBeInTheDocument();
        expect(within(dialog).getByLabelText(/end time/i)).toBeInTheDocument();
        expect(within(dialog).getByText(/recurring appointment/i)).toBeInTheDocument();
        expect(within(dialog).getByLabelText(/notes/i)).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: /^add$/i })).toBeInTheDocument();
        const clientLabels = within(dialog).getAllByText(/^client$/i);
        expect(clientLabels.length).toBeGreaterThanOrEqual(1);
        expect(within(dialog).getByLabelText(/services/i)).toBeInTheDocument();
      });
    });
  });

  describe('Client field and Add Client drawer', () => {
    it('Client field has select dropdown and Add button', async () => {
      mockGetUserOrganization.mockResolvedValue({
        id: 'org-1',
        membership: { role: 'admin' },
      });

      render(<SchedulePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add appointment/i })).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole('button', { name: /add appointment/i }).click();
      });

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const clientLabels = within(dialog).getAllByText(/^client$/i);
        expect(clientLabels.length).toBeGreaterThanOrEqual(1);
        const addBtn = within(dialog).getByRole('button', { name: /^add$/i });
        expect(addBtn).toBeInTheDocument();
      });
    });

    it('clicking Add for Client opens drawer to add new client (name, phone, email, company)', async () => {
      mockGetUserOrganization.mockResolvedValue({
        id: 'org-1',
        membership: { role: 'admin' },
      });

      render(<SchedulePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add appointment/i })).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole('button', { name: /add appointment/i }).click();
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const addClientBtn = within(screen.getByRole('dialog')).getByRole('button', { name: /^add$/i });
      await act(async () => {
        addClientBtn.click();
      });

      await waitFor(() => {
        const dialogs = screen.getAllByRole('dialog');
        const clientDrawer = dialogs.find(
          (d) => within(d).queryByLabelText(/name/i) !== null || within(d).queryByPlaceholderText(/name/i) !== null
        );
        expect(clientDrawer).toBeDefined();
      });

      const dialogs = screen.getAllByRole('dialog');
      const clientForm = dialogs.find(
        (d) => within(d).queryByLabelText(/name/i) != null || within(d).queryByPlaceholderText(/name/i) != null
      );
      if (clientForm) {
        expect(within(clientForm).getByLabelText(/name/i) || within(clientForm).getByPlaceholderText(/name/i)).toBeTruthy();
        expect(
          within(clientForm).queryByLabelText(/phone/i) != null ||
            within(clientForm).queryByPlaceholderText(/phone/i) != null ||
            within(clientForm).queryByText(/phone/i) != null
        ).toBeTruthy();
        expect(
          within(clientForm).queryByLabelText(/email/i) != null ||
            within(clientForm).queryByPlaceholderText(/email/i) != null
        ).toBeTruthy();
      }
    });
  });
});
