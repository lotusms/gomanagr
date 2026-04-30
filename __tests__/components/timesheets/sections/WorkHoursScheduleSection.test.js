import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import WorkHoursScheduleSection from '@/components/timesheets/sections/WorkHoursScheduleSection';

jest.mock('next/link', () => ({
  __esModule: true,
  default: function NextLink({ children, href }) {
    return <a href={href}>{children}</a>;
  },
}));

jest.mock('@/components/timesheets/WorkHoursCalendarGrid', () => ({
  __esModule: true,
  default: function MockWorkHoursCalendarGrid() {
    return <div data-testid="work-hours-calendar-grid">calendar</div>;
  },
}));

const mockFetchWorkShiftsForMember = jest.fn();
const mockFetchAllWorkShiftsForOrg = jest.fn();
const mockReplaceWorkShiftsForMember = jest.fn();

jest.mock('@/lib/orgWorkShiftPatterns', () => ({
  ...jest.requireActual('@/lib/orgWorkShiftPatterns'),
  fetchWorkShiftsForMember: (...args) => mockFetchWorkShiftsForMember(...args),
  fetchAllWorkShiftsForOrg: (...args) => mockFetchAllWorkShiftsForOrg(...args),
  replaceWorkShiftsForMember: (...args) => mockReplaceWorkShiftsForMember(...args),
}));

jest.mock('@/lib/UserAccountContext', () => ({
  useUserAccount: () => ({
    account: { email: 'viewer@example.com', first_name: 'View', last_name: 'Er' },
    preview: null,
  }),
}));

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

function setupRouter(overrides = {}) {
  useRouter.mockReturnValue({
    pathname: '/dashboard/time-tracking',
    query: {},
    asPath: '/dashboard/time-tracking',
    isReady: true,
    replace: jest.fn(),
    push: jest.fn(),
    ...overrides,
  });
}

describe('WorkHoursScheduleSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupRouter();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ members: [] }),
      })
    );
    mockFetchWorkShiftsForMember.mockResolvedValue([]);
    mockFetchAllWorkShiftsForOrg.mockResolvedValue([]);
    mockReplaceWorkShiftsForMember.mockResolvedValue(undefined);
  });

  it('shows sign-in copy when organizationId is missing', () => {
    render(<WorkHoursScheduleSection currentUserId="u1" memberView={false} />);
    expect(screen.getByText(/sign in and join an organization/i)).toBeInTheDocument();
  });

  it('shows sign-in copy when currentUserId is missing', () => {
    render(<WorkHoursScheduleSection organizationId="org-1" memberView={false} />);
    expect(screen.getByText(/sign in and join an organization/i)).toBeInTheDocument();
  });

  it('member view: shows empty state when no weekly hours are returned', async () => {
    render(
      <WorkHoursScheduleSection organizationId="org-1" currentUserId="u1" memberView teamTerm="Team" />
    );
    expect(screen.getByRole('heading', { name: /your work week/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(/no weekly hours has been set for you yet/i)
    ).toBeInTheDocument();
    expect(mockFetchWorkShiftsForMember).toHaveBeenCalled();
  });

  it('member view: renders calendar when shifts exist', async () => {
    mockFetchWorkShiftsForMember.mockResolvedValue([
      { id: 's1', weekday: 0, start_time: '09:00:00', end_time: '17:00:00' },
    ]);
    render(
      <WorkHoursScheduleSection organizationId="org-1" currentUserId="u1" memberView teamTerm="Crew" />
    );
    await waitFor(() => {
      expect(screen.getByTestId('work-hours-calendar-grid')).toBeInTheDocument();
    });
    expect(screen.getByText(/recurring weekly hours set by your crew admin/i)).toBeInTheDocument();
  });

  it('member view: shows migration hint when load error mentions missing relation', async () => {
    mockFetchWorkShiftsForMember.mockRejectedValue(new Error('relation "org_work_shift_patterns" does not exist'));
    render(
      <WorkHoursScheduleSection organizationId="org-1" currentUserId="u1" memberView />
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/077_org_work_shift_patterns/i)).toBeInTheDocument();
  });

  it('admin view: shows no members message when org member list is empty', async () => {
    render(
      <WorkHoursScheduleSection organizationId="org-1" currentUserId="admin-1" memberView={false} teamTerm="Team" />
    );
    await waitFor(() => {
      expect(screen.getByText(/no team members found/i)).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/get-org-members',
      expect.objectContaining({ method: 'POST' })
    );
    expect(mockFetchAllWorkShiftsForOrg).toHaveBeenCalled();
  });

  it('admin view: shows team calendar when members and shifts load', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            members: [
              {
                user_id: 'm1',
                displayName: 'Alex Worker',
                user: { email: 'alex@example.com', first_name: 'Alex', last_name: 'Worker' },
              },
            ],
          }),
      })
    );
    mockFetchAllWorkShiftsForOrg.mockResolvedValue([
      { id: 'sh1', user_id: 'm1', weekday: 1, start_time: '10:00:00', end_time: '16:00:00' },
    ]);

    render(
      <WorkHoursScheduleSection organizationId="org-1" currentUserId="admin-1" memberView={false} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('work-hours-calendar-grid')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /work schedules \(team\)/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/filter calendar by name or email/i)).toBeInTheDocument();
  });

  it('admin view: manage member flow shows editor and back button', async () => {
    setupRouter({
      query: { manageMember: 'm1' },
    });
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            members: [
              {
                user_id: 'm1',
                displayName: 'Jordan',
                user: { email: 'jordan@example.com' },
              },
            ],
          }),
      })
    );
    mockFetchAllWorkShiftsForOrg.mockResolvedValue([]);

    render(
      <WorkHoursScheduleSection organizationId="org-1" currentUserId="admin-1" memberView={false} />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to team calendar/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /^jordan$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add day \/ hours/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save weekly hours/i })).toBeInTheDocument();
  });

  it('admin view: can add a draft row while managing a member', async () => {
    const user = userEvent.setup();
    setupRouter({ query: { manageMember: 'm1' } });
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            members: [{ user_id: 'm1', displayName: 'Jordan', user: { email: 'j@e.com' } }],
          }),
      })
    );
    mockFetchAllWorkShiftsForOrg.mockResolvedValue([]);

    render(
      <WorkHoursScheduleSection organizationId="org-1" currentUserId="admin-1" memberView={false} />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add day \/ hours/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add day \/ hours/i }));

    const daySelects = screen.getAllByRole('combobox', { name: /day/i });
    expect(daySelects.length).toBeGreaterThanOrEqual(1);
    expect(within(daySelects[0].parentElement).getByRole('option', { name: 'Mon' })).toBeInTheDocument();
  });
});
