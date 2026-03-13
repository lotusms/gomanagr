/**
 * Schedule page – Loading skeleton
 * - When load completes before 1s: Loading… then content (no skeleton).
 * - When load takes at least 1s: Loading… then skeleton, then content.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import SchedulePage from '@/pages/dashboard/schedule/index';

const mockRouterPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    pathname: '/dashboard/schedule',
    query: {},
    asPath: '/dashboard/schedule',
  }),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user-1', email: 'member@example.com' },
  }),
}));

const mockGetUserAccount = jest.fn();
const mockGetUserAccountFromServer = jest.fn();
const mockDeleteAppointment = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  getUserAccountFromServer: (...args) => mockGetUserAccountFromServer(...args),
  deleteAppointment: (...args) => mockDeleteAppointment(...args),
}));

const mockGetUserOrganization = jest.fn();
jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

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

const schedulePayload = {
  teamMembers: [{ id: 'tm1', name: 'Alice', email: 'member@example.com' }],
  appointments: [],
  clients: [],
  services: [],
  businessHoursStart: '08:00',
  businessHoursEnd: '18:00',
  timeFormat: '24h',
  dateFormat: 'MM/DD/YYYY',
  timezone: 'UTC',
};

describe('Schedule page – Loading skeleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetUserAccount.mockResolvedValue({ teamMembers: [], appointments: [] });
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'member' },
    });
    global.fetch = jest.fn((url, opts = {}) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('org-schedule-data')) {
        return Promise.resolve({
          json: () => Promise.resolve({ schedule: schedulePayload }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows content when load completes before 1 second (no skeleton)', async () => {
    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /schedule/i })).toBeInTheDocument();
    });

    expect(screen.queryByTestId('schedule-page-skeleton')).not.toBeInTheDocument();
  });

  it('shows skeleton after 1 second when load is slow, then content when loaded', async () => {
    let resolveScheduleFetch;
    global.fetch = jest.fn((url, opts = {}) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('org-schedule-data')) {
        return new Promise((resolve) => {
          resolveScheduleFetch = () => resolve({
            json: () => Promise.resolve({ schedule: schedulePayload }),
          });
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByText(/loading…/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('schedule-page-skeleton')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('schedule-page-skeleton')).toBeInTheDocument();
    expect(screen.queryByText(/loading…/i)).not.toBeInTheDocument();

    resolveScheduleFetch();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /schedule/i })).toBeInTheDocument();
    });

    expect(screen.queryByTestId('schedule-page-skeleton')).not.toBeInTheDocument();
  }, 10000);
});
