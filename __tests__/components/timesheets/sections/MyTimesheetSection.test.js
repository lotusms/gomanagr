import { render, screen, within } from '@testing-library/react';
import MyTimesheetSection from '@/components/timesheets/sections/MyTimesheetSection';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard/time-tracking',
    query: {},
    asPath: '/dashboard/time-tracking',
  }),
}));

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const defaultFlags = {
  emphasizeClock: false,
  showWorkOrderJobSite: false,
  showBillableAndRates: true,
};

describe('MyTimesheetSection', () => {
  it('shows loading skeletons and table loading copy', () => {
    const { container } = render(
      <MyTimesheetSection
        flags={defaultFlags}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[]}
        weeklyTotalHours={0}
        isRegularMember
        loading
      />
    );
    expect(container.querySelectorAll('.animate-pulse .rounded-2xl').length).toBe(2);
    expect(screen.getByText(/loading time entries/i)).toBeInTheDocument();
  });

  it('shows four KPI placeholders for admin while loading', () => {
    const { container } = render(
      <MyTimesheetSection
        flags={defaultFlags}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[]}
        weeklyTotalHours={0}
        isRegularMember={false}
        loading
      />
    );
    expect(container.querySelectorAll('.animate-pulse .rounded-2xl').length).toBe(4);
  });

  it('regular member: empty week shows EmptyState and KPIs', () => {
    render(
      <MyTimesheetSection
        flags={defaultFlags}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[]}
        weeklyTotalHours={0}
        isRegularMember
        memberLogLabels={{
          hoursKpiTitle: 'Hours logged',
          hoursKpiSub: 'Goal 32h',
          weekPanelTitle: 'My week',
          weekPanelHint: 'Log daily.',
          tableFirstColLabel: 'Work',
          showLinkedContext: false,
        }}
      />
    );
    expect(screen.getByText('Hours logged')).toBeInTheDocument();
    expect(screen.getByText('Goal 32h')).toBeInTheDocument();
    const weekHeaderRow = screen.getByRole('heading', { name: /my week/i }).parentElement;
    expect(weekHeaderRow).toHaveTextContent('Add time');
    expect(weekHeaderRow).toHaveTextContent('Log daily.');
    expect(screen.getByText(/no time logged this week/i)).toBeInTheDocument();
    expect(screen.getByText(/week total/i)).toBeInTheDocument();
    expect(screen.getAllByText('0h').length).toBeGreaterThanOrEqual(1);
  });

  it('regular member: shows rejected and approved status badges', () => {
    const { rerender } = render(
      <MyTimesheetSection
        flags={defaultFlags}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[
          {
            id: 'r1',
            notes: 'Bad entry',
            method: 'Manual',
            status: 'Rejected',
            dayIndex: 0,
            hours: 1,
            billable: true,
            costable: true,
          },
        ]}
        weeklyTotalHours={1}
        isRegularMember
      />
    );
    expect(screen.getByText('Rejected')).toBeInTheDocument();

    rerender(
      <MyTimesheetSection
        flags={defaultFlags}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[
          {
            id: 'a2',
            notes: 'Good entry',
            method: 'Clock',
            status: 'Approved',
            dayIndex: 1,
            hours: 2,
            billable: true,
            costable: true,
          },
        ]}
        weeklyTotalHours={2}
        isRegularMember
      />
    );
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('regular member: linked context without type prefix when linkedType is null', () => {
    render(
      <MyTimesheetSection
        flags={defaultFlags}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[
          {
            id: 'e0',
            notes: 'Misc',
            method: 'Manual',
            status: 'Draft',
            dayIndex: 0,
            hours: 1,
            linkedLabel: 'Unclassified',
            linkedType: null,
            billable: true,
            costable: true,
          },
        ]}
        weeklyTotalHours={1}
        isRegularMember
        memberLogLabels={{
          tableFirstColLabel: 'Activity',
          showLinkedContext: true,
        }}
      />
    );
    const table = screen.getByRole('table', { name: /my weekly timesheet/i });
    expect(within(table).getByText('Unclassified')).toBeInTheDocument();
    expect(within(table).queryByText(/·/)).not.toBeInTheDocument();
  });

  it('regular member: table shows status badge and day hours', () => {
    render(
      <MyTimesheetSection
        flags={defaultFlags}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[
          {
            id: 'e1',
            notes: 'Client work',
            method: 'Timer',
            status: 'Submitted',
            dayIndex: 2,
            hours: 7.5,
            linkedLabel: 'Acme Co',
            linkedType: 'Client',
            billable: true,
            costable: true,
          },
        ]}
        weeklyTotalHours={7.5}
        isRegularMember
        memberLogLabels={{
          tableFirstColLabel: 'Activity',
          showLinkedContext: true,
        }}
      />
    );
    const table = screen.getByRole('table', { name: /my weekly timesheet/i });
    expect(within(table).getByText('Client work')).toBeInTheDocument();
    expect(within(table).getByText(/client · acme co/i)).toBeInTheDocument();
    expect(within(table).getByText('Timer')).toBeInTheDocument();
    expect(within(table).getByText('Submitted')).toBeInTheDocument();
    expect(within(table).getAllByText('7.5h').length).toBeGreaterThanOrEqual(1);
    expect(within(table).getAllByText('—').length).toBeGreaterThan(0);
  });

  it('admin: shows billable vs non-billable KPI when flag enabled', () => {
    render(
      <MyTimesheetSection
        flags={{ ...defaultFlags, showBillableAndRates: true }}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[]}
        weeklyTotalHours={32}
        isRegularMember={false}
        adminStats={{ billableHours: 20, nonBillableHours: 12, pendingApprovalCount: 3 }}
      />
    );
    expect(screen.getByText('Billable')).toBeInTheDocument();
    expect(screen.getByText('20h')).toBeInTheDocument();
    expect(screen.getByText(/vs 12h non-billable/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/submitted entries/i)).toBeInTheDocument();
  });

  it('admin: singular pending copy when one entry awaits approval', () => {
    render(
      <MyTimesheetSection
        flags={{ ...defaultFlags, showBillableAndRates: true }}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[]}
        weeklyTotalHours={1}
        isRegularMember={false}
        adminStats={{ billableHours: 1, nonBillableHours: 0, pendingApprovalCount: 1 }}
      />
    );
    expect(screen.getByText(/submitted entry$/i)).toBeInTheDocument();
  });

  it('admin: paid hours KPI when billable flag disabled', () => {
    render(
      <MyTimesheetSection
        flags={{ ...defaultFlags, showBillableAndRates: false }}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[]}
        weeklyTotalHours={24}
        isRegularMember={false}
        adminStats={{ billableHours: 0, nonBillableHours: 0, pendingApprovalCount: 0 }}
      />
    );
    expect(screen.getByText('Paid hours')).toBeInTheDocument();
    expect(screen.getByText(/payroll basis/i)).toBeInTheDocument();
  });

  it('admin: row shows non-billable when not billable and omits costable tag when costable is false', () => {
    render(
      <MyTimesheetSection
        flags={defaultFlags}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[
          {
            id: 'nb1',
            notes: 'Internal',
            method: 'Manual',
            status: 'Draft',
            dayIndex: 4,
            hours: 1,
            linkedType: 'Internal',
            linkedLabel: '',
            billable: false,
            costable: false,
          },
        ]}
        weeklyTotalHours={1}
        isRegularMember={false}
      />
    );
    const table = screen.getByRole('table', { name: /my weekly timesheet/i });
    expect(within(table).getByText('Non-billable')).toBeInTheDocument();
    expect(within(table).queryByText('Costable')).not.toBeInTheDocument();
  });

  it('admin: row shows billable and costable tags', () => {
    render(
      <MyTimesheetSection
        flags={defaultFlags}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[
          {
            id: 'a1',
            notes: 'Admin view row',
            method: 'Manual',
            status: 'Approved',
            dayIndex: 0,
            hours: 2,
            linkedType: 'Project',
            linkedLabel: 'Website',
            billable: true,
            costable: true,
          },
        ]}
        weeklyTotalHours={2}
        isRegularMember={false}
      />
    );
    const table = screen.getByRole('table', { name: /my weekly timesheet/i });
    expect(within(table).getByText('Billable')).toBeInTheDocument();
    expect(within(table).getByText('Costable')).toBeInTheDocument();
    expect(screen.getByText(/linked record:/i)).toBeInTheDocument();
    expect(screen.getByText(/project · website/i)).toBeInTheDocument();
  });

  it('renders optional clock and on-site buttons when flags enabled', () => {
    render(
      <MyTimesheetSection
        flags={{ emphasizeClock: true, showWorkOrderJobSite: true, showBillableAndRates: true }}
        clientTerm="Client"
        dayLabels={DAY_LABELS}
        entries={[]}
        weeklyTotalHours={0}
        isRegularMember
      />
    );
    expect(screen.getByRole('button', { name: /clock in/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /on site/i })).toBeDisabled();
  });
});
