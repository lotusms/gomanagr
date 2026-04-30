import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkShiftAllocationPopover, {
  buildWeeklyHoursLines,
} from '@/components/timesheets/WorkShiftAllocationPopover';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

describe('buildWeeklyHoursLines', () => {
  it('returns empty when shifts or userId missing', () => {
    expect(buildWeeklyHoursLines([], 'u1', '12h')).toEqual([]);
    expect(buildWeeklyHoursLines([{ user_id: 'u1', weekday: 0, start_time: '09:00:00', end_time: '10:00:00' }], '', '12h')).toEqual([]);
  });

  it('filters and sorts by weekday then start time', () => {
    const lines = buildWeeklyHoursLines(
      [
        { user_id: 'u1', weekday: 2, start_time: '14:00:00', end_time: '16:00:00' },
        { user_id: 'u1', weekday: 1, start_time: '09:00:00', end_time: '12:00:00' },
        { user_id: 'u2', weekday: 0, start_time: '08:00:00', end_time: '09:00:00' },
      ],
      'u1',
      '24h'
    );
    expect(lines.map((l) => l.day)).toEqual(['Tue', 'Wed']);
    expect(lines[0].range).toMatch(/09:00|9:00/);
  });
});

describe('WorkShiftAllocationPopover', () => {
  it('opens dialog on hover and shows weekly lines and edit link', async () => {
    const user = userEvent.setup();
    render(
      <WorkShiftAllocationPopover
        profile={{ name: 'Pat Lee', email: 'pat@example.com', role: 'team_lead' }}
        weeklyLines={[
          { day: 'Mon', range: '9:00 AM – 5:00 PM' },
          { day: 'Tue', range: '9:00 AM – 5:00 PM' },
        ]}
        blockRange="1:00 PM – 3:00 PM"
        dayHeading="Monday, January 6, 2025"
        editScheduleHref="/dashboard/time-tracking?section=schedule&manageMember=u1"
      >
        <span>Allocation</span>
      </WorkShiftAllocationPopover>
    );

    await user.hover(screen.getByText('Allocation'));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /pat lee work hours/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Monday, January 6, 2025')).toBeInTheDocument();
    expect(screen.getByText('1:00 PM – 3:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Role: Team lead')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit schedule/i })).toHaveAttribute(
      'href',
      '/dashboard/time-tracking?section=schedule&manageMember=u1'
    );
  });

  it('shows empty weekly pattern copy when no lines', async () => {
    const user = userEvent.setup();
    render(
      <WorkShiftAllocationPopover
        profile={{ name: 'No Pattern', email: '', role: '' }}
        weeklyLines={[]}
        blockRange="10a – 11a"
        dayHeading="Tuesday"
      >
        <span>Bar</span>
      </WorkShiftAllocationPopover>
    );
    await user.hover(screen.getByText('Bar'));
    await waitFor(() => {
      expect(screen.getByText(/no pattern saved for this person/i)).toBeInTheDocument();
    });
  });
});
