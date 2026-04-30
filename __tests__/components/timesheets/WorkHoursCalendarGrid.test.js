import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkHoursCalendarGrid from '@/components/timesheets/WorkHoursCalendarGrid';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

const resolveMember = (uid) => ({
  label: uid === 'u1' ? 'Alex' : 'Someone',
  photoUrl: '',
  email: 'alex@example.com',
  role: 'admin',
});

describe('WorkHoursCalendarGrid', () => {
  const onPrev = jest.fn();
  const onNext = jest.fn();
  const onToday = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('monthGrid: renders calendar region, month title, and navigation calls handlers', async () => {
    const user = userEvent.setup();
    render(
      <WorkHoursCalendarGrid
        year={2025}
        month={0}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        shifts={[]}
        resolveMember={resolveMember}
        teamColumnLabel="Crew"
        variant="monthGrid"
      />
    );

    expect(screen.getByRole('region', { name: /crew monthly work hours/i })).toBeInTheDocument();
    expect(screen.getByText(/january 2025/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /previous month/i }));
    expect(onPrev).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /next month/i }));
    expect(onNext).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /^today$/i }));
    expect(onToday).toHaveBeenCalled();
  });

  it('monthGrid: shows shift time range for matching weekday', async () => {
    const { container } = render(
      <WorkHoursCalendarGrid
        year={2025}
        month={0}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        shifts={[{ user_id: 'u1', weekday: 0, start_time: '09:00:00', end_time: '17:00:00' }]}
        resolveMember={resolveMember}
        getEditMemberScheduleHref={() => '/edit/u1'}
        variant="monthGrid"
      />
    );
    await waitFor(() => {
      expect(container.textContent).toMatch(/9:00\s*AM/i);
      expect(container.textContent).toMatch(/5:00\s*PM/i);
    });
  });

  it('timeline variant: renders day column and time slots', () => {
    render(
      <WorkHoursCalendarGrid
        year={2025}
        month={0}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        shifts={[]}
        resolveMember={resolveMember}
        timeFormat="24h"
        variant="timeline"
      />
    );
    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /monthly work hours/i })).toBeInTheDocument();
  });
});
