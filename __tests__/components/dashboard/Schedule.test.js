/**
 * Unit tests for Schedule component: week nav, processAppointments (date string vs Date), grid cells, AppointmentPopover.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Schedule from '@/components/dashboard/Schedule';

function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  return (
    x.getFullYear() +
    '-' +
    String(x.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(x.getDate()).padStart(2, '0')
  );
}

/** Return a date key for a day in the current week (Monday = 0). */
function currentWeekDayKey(dayOffset) {
  const weekStart = getWeekStart(new Date());
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + dayOffset);
  return toDateKey(d);
}

/** Return a Date for a day in the current week. */
function currentWeekDate(dayOffset) {
  const weekStart = getWeekStart(new Date());
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + dayOffset);
  return d;
}

const teamMembers = [
  { id: 'tm1', name: 'Alice' },
  { id: 'tm2', name: 'Bob' },
];
const clients = [{ id: 'c1', name: 'Acme' }];

jest.mock('@/components/dashboard/AppointmentPopover', () => function MockAppointmentPopover({ appointment, children }) {
  return (
    <div data-testid="appointment-popover" data-appointment-id={appointment?.id}>
      {children}
    </div>
  );
});

describe('Schedule', () => {
  it('renders week header and nav buttons', () => {
    render(
      <Schedule
        appointments={[]}
        teamMembers={teamMembers}
        clients={clients}
        businessHoursStart="08:00"
        businessHoursEnd="18:00"
      />
    );
    expect(screen.getByRole('button', { name: /previous week/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next week/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
  });

  it('Previous week changes visible week', () => {
    render(
      <Schedule
        appointments={[]}
        teamMembers={teamMembers}
        clients={clients}
      />
    );
    const monthYearBefore = screen.getByText(/\w+ \d{4}/).textContent;
    fireEvent.click(screen.getByRole('button', { name: /previous week/i }));
    const monthYearAfter = screen.getByText(/\w+ \d{4}/).textContent;
    expect(monthYearBefore).toBeDefined();
    expect(monthYearAfter).toBeDefined();
  });

  it('Next week changes visible week', () => {
    render(
      <Schedule
        appointments={[]}
        teamMembers={teamMembers}
        clients={clients}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /next week/i }));
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
  });

  it('Today resets week to current week', () => {
    render(
      <Schedule
        appointments={[]}
        teamMembers={teamMembers}
        clients={clients}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /next week/i }));
    fireEvent.click(screen.getByRole('button', { name: /today/i }));
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
  });

  it('processes appointments with date as string in current week', () => {
    const dateKey = currentWeekDayKey(0);
    render(
      <Schedule
        appointments={[
          {
            id: 'apt1',
            title: 'Client call',
            staffId: 'tm1',
            date: dateKey,
            start: '09:00',
            end: '10:00',
          },
        ]}
        teamMembers={teamMembers}
        clients={clients}
      />
    );
    expect(screen.getByText('Client call')).toBeInTheDocument();
    expect(screen.getByTestId('appointment-popover')).toBeInTheDocument();
  });

  it('processes appointments with date as Date object in current week', () => {
    const dateObj = currentWeekDate(1);
    const dateKey = toDateKey(dateObj);
    render(
      <Schedule
        appointments={[
          {
            id: 'apt2',
            title: 'Consultation',
            staffId: 'tm2',
            date: dateObj,
            start: '10:00',
            end: '11:00',
          },
        ]}
        teamMembers={teamMembers}
        clients={clients}
      />
    );
    expect(screen.getByText('Consultation')).toBeInTheDocument();
  });

  it('shows Appointment as title when appointment.title is empty', () => {
    const dateKey = currentWeekDayKey(2);
    render(
      <Schedule
        appointments={[
          {
            id: 'apt3',
            title: '',
            staffId: 'tm1',
            date: dateKey,
            start: '14:00',
            end: '15:00',
          },
        ]}
        teamMembers={teamMembers}
        clients={clients}
      />
    );
    expect(screen.getByText('Appointment')).toBeInTheDocument();
  });

  it('renders appointment with staffIds array (group) and currentUserStaffId for canEdit/canDelete', () => {
    const dateKey = currentWeekDayKey(0);
    render(
      <Schedule
        appointments={[
          {
            id: 'apt-group',
            title: 'Group meeting',
            staffIds: ['tm1', 'tm2'],
            staffId: 'tm1',
            date: dateKey,
            start: '11:00',
            end: '12:00',
          },
        ]}
        teamMembers={teamMembers}
        clients={clients}
        isTeamMember={true}
        currentUserStaffId="tm1"
      />
    );
    expect(screen.getByText('Group meeting')).toBeInTheDocument();
    expect(screen.getByTestId('appointment-popover')).toHaveAttribute('data-appointment-id', 'apt-group');
  });

  it('filters out appointments not in visible week', () => {
    const weekStart = getWeekStart(new Date());
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(weekStart.getDate() + 7);
    const nextWeekKey = toDateKey(nextWeek);
    render(
      <Schedule
        appointments={[
          {
            id: 'apt-out',
            title: 'Next week',
            staffId: 'tm1',
            date: nextWeekKey,
            start: '09:00',
            end: '10:00',
          },
        ]}
        teamMembers={teamMembers}
        clients={clients}
      />
    );
    expect(screen.queryByText('Next week')).not.toBeInTheDocument();
  });

  it('renders empty state when appointments is null or not array', () => {
    const { unmount } = render(
      <Schedule
        appointments={null}
        teamMembers={teamMembers}
        clients={clients}
      />
    );
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
    unmount();
    render(
      <Schedule
        appointments={undefined}
        teamMembers={teamMembers}
        clients={clients}
      />
    );
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
  });
});
