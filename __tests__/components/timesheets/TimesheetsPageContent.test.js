import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/router';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { fetchOrgTimeEntriesForWeek } from '@/lib/orgTimeEntries';
import TimesheetsPageContent from '@/components/timesheets/TimesheetsPageContent';

jest.mock('@/components/timesheets/sections/MyTimesheetSection', () => ({
  __esModule: true,
  default: () => <div data-testid="my-timesheet-section" />,
}));
jest.mock('@/components/timesheets/sections/MemberTimeOffPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="member-time-off" />,
}));
jest.mock('@/components/timesheets/sections/WorkHoursScheduleSection', () => ({
  __esModule: true,
  default: (props) => (
    <div
      data-testid="work-hours-schedule"
      data-member-view={props.memberView ? 'true' : 'false'}
      data-org={props.organizationId || ''}
    />
  ),
}));
jest.mock('@/components/timesheets/sections/TeamOverviewSection', () => ({
  __esModule: true,
  default: () => <div data-testid="team-overview" />,
}));
jest.mock('@/components/timesheets/sections/ApprovalQueueSection', () => ({
  __esModule: true,
  default: () => <div data-testid="approvals" />,
}));
jest.mock('@/components/timesheets/sections/ClientJobTimeSection', () => ({
  __esModule: true,
  default: () => <div data-testid="client-job" />,
}));
jest.mock('@/components/timesheets/sections/ReportsSection', () => ({
  __esModule: true,
  default: () => <div data-testid="reports" />,
}));
jest.mock('@/components/timesheets/sections/SettingsSection', () => ({
  __esModule: true,
  default: () => <div data-testid="settings" />,
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/services/userService', () => ({
  getUserAccount: jest.fn(),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: jest.fn(),
}));

jest.mock('@/lib/orgTimeEntries', () => ({
  ...jest.requireActual('@/lib/orgTimeEntries'),
  fetchOrgTimeEntriesForWeek: jest.fn(),
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

const adminOrg = {
  id: 'org-1',
  industry: 'services',
  membership: { role: 'admin' },
};

const memberOrg = {
  id: 'org-1',
  industry: 'services',
  membership: { role: 'member' },
};

describe('TimesheetsPageContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupRouter();
    useAuth.mockReturnValue({ currentUser: { uid: 'user-1' } });
    getUserAccount.mockResolvedValue({ industry: 'services' });
    getUserOrganization.mockResolvedValue(adminOrg);
    fetchOrgTimeEntriesForWeek.mockResolvedValue([]);
  });

  it('shows loading skeleton while org and account are loading', () => {
    getUserOrganization.mockImplementation(() => new Promise(() => {}));
    getUserAccount.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<TimesheetsPageContent />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('admin: shows Time tracking header and opens schedule section', async () => {
    const user = userEvent.setup();
    render(<TimesheetsPageContent />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /time tracking/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /^schedule$/i }));
    expect(await screen.findByTestId('work-hours-schedule')).toHaveAttribute('data-member-view', 'false');
  });

  it('admin: deep-link section=schedule opens org schedule', async () => {
    setupRouter({ query: { section: 'schedule' }, isReady: true });
    render(<TimesheetsPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId('work-hours-schedule')).toHaveAttribute('data-member-view', 'false');
    });
  });

  it('member: shows My work & time and member schedule hub', async () => {
    getUserOrganization.mockResolvedValue(memberOrg);
    const user = userEvent.setup();
    render(<TimesheetsPageContent />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /my work & time/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('tab', { name: /^schedule$/i }));
    expect(await screen.findByTestId('work-hours-schedule')).toHaveAttribute('data-member-view', 'true');
  });

  it('member: hides main section tabs when only My timesheet is available', async () => {
    getUserOrganization.mockResolvedValue(memberOrg);
    render(<TimesheetsPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId('my-timesheet-section')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /^team$/i })).not.toBeInTheDocument();
  });

  it('shows time entry load error when fetch fails', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchOrgTimeEntriesForWeek.mockRejectedValueOnce(new Error('relation org_time_entries does not exist'));
    render(<TimesheetsPageContent />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/org_time_entries/i);
    });
    errSpy.mockRestore();
  });

  it('admin: switches to Team tab', async () => {
    const user = userEvent.setup();
    render(<TimesheetsPageContent />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^team$/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /^team$/i }));
    expect(await screen.findByTestId('team-overview')).toBeInTheDocument();
  });

  it('admin: switches to Client / job time tab with industry label', async () => {
    const user = userEvent.setup();
    render(<TimesheetsPageContent />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /job time/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /job time/i }));
    expect(await screen.findByTestId('client-job')).toBeInTheDocument();
  });
});
