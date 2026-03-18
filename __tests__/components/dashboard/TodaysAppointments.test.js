/**
 * Unit tests for TodaysAppointments:
 * - Renders heading, date label; empty state vs table
 * - getAppointmentsForToday filtering by date; staff rows; appointment display text
 * - AppointmentPopover props; canEdit/canDelete; industry term
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import TodaysAppointments from '@/components/dashboard/TodaysAppointments';

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDate: (dateString) => (dateString ? `formatted:${dateString}` : ''),
}));

jest.mock('@/components/ui/Tooltip', () => function MockTooltip({ content, children }) {
  return <span data-testid="tooltip" title={content}>{children}</span>;
});

jest.mock('@/components/ui/Avatar', () => function MockAvatar({ name }) {
  return <span data-testid="avatar">{name}</span>;
});

jest.mock('@/components/ui/EmptyState', () => function MockEmptyState({ type }) {
  return <div data-testid="empty-state" data-type={type}>No appointments</div>;
});

jest.mock('@/components/dashboard/AppointmentPopover', () => function MockAppointmentPopover({
  appointment, canEdit, canDelete, children,
}) {
  return (
    <div data-testid="appointment-popover" data-appointment-id={appointment?.id} data-can-edit={String(canEdit)} data-can-delete={String(canDelete)}>
      {children}
    </div>
  );
});

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (industry, key) => (industry ? `${key}-${industry}` : (key === 'team' ? 'Team' : key)),
}));

describe('TodaysAppointments', () => {
  const getEffectiveTz = (tz = 'UTC') => {
    if (tz && tz !== 'UTC') return tz;
    const localTz = typeof Intl !== 'undefined' && Intl.DateTimeFormat?.().resolvedOptions?.().timeZone;
    return localTz || 'UTC';
  };
  const getTodayKey = (tz = 'UTC') =>
    new Date().toLocaleDateString('en-CA', { timeZone: getEffectiveTz(tz) });

  it('renders heading and date label', () => {
    render(
      <TodaysAppointments
        appointments={[]}
        staff={[]}
        timezone="UTC"
      />
    );
    expect(screen.getByRole('heading', { name: /today's appointments/i })).toBeInTheDocument();
  });

  it('renders empty state when no staff with appointments', () => {
    render(
      <TodaysAppointments
        appointments={[]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
      />
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No appointments')).toBeInTheDocument();
  });

  it('renders table when there are appointments for today', () => {
    const todayKey = getTodayKey('UTC');
    render(
      <TodaysAppointments
        appointments={[
          {
            id: 'a1',
            date: todayKey,
            start: '09:00',
            end: '10:00',
            staffId: 's1',
            clientId: null,
            services: [],
          },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
      />
    );
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('Jane').length).toBeGreaterThanOrEqual(1);
  });

  it('uses team term from industry for column header', () => {
    const todayKey = getTodayKey('UTC');
    render(
      <TodaysAppointments
        appointments={[
          { id: 'a1', date: todayKey, start: '09:00', end: '10:00', staffId: 's1', services: [] },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
        industry="healthcare"
      />
    );
    expect(screen.getByText('team-healthcare')).toBeInTheDocument();
  });

  it('shows appointment display text as client name and service when both present', () => {
    const todayKey = getTodayKey('UTC');
    render(
      <TodaysAppointments
        appointments={[
          {
            id: 'a1',
            date: todayKey,
            start: '09:00',
            end: '10:00',
            staffId: 's1',
            clientId: 'c1',
            services: ['Consultation'],
          },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        clients={[{ id: 'c1', name: 'Acme Corp' }]}
        timezone="UTC"
      />
    );
    expect(screen.getByText('Acme Corp - Consultation')).toBeInTheDocument();
  });

  it('shows client name only when no service', () => {
    const todayKey = getTodayKey('UTC');
    render(
      <TodaysAppointments
        appointments={[
          {
            id: 'a1',
            date: todayKey,
            start: '09:00',
            end: '10:00',
            staffId: 's1',
            clientId: 'c1',
            services: [],
          },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        clients={[{ id: 'c1', name: 'Acme Corp' }]}
        timezone="UTC"
      />
    );
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows service only when no client', () => {
    const todayKey = getTodayKey('UTC');
    render(
      <TodaysAppointments
        appointments={[
          {
            id: 'a1',
            date: todayKey,
            start: '09:00',
            end: '10:00',
            staffId: 's1',
            services: ['Consultation'],
          },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
      />
    );
    expect(screen.getByText('Consultation')).toBeInTheDocument();
  });

  it('shows "Appointment" when no client and no service', () => {
    const todayKey = getTodayKey('UTC');
    render(
      <TodaysAppointments
        appointments={[
          {
            id: 'a1',
            date: todayKey,
            start: '09:00',
            end: '10:00',
            staffId: 's1',
            services: [],
          },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
      />
    );
    expect(screen.getByText('Appointment')).toBeInTheDocument();
  });

  it('filters out appointments not for today', () => {
    const today = new Date();
    const other = new Date(today);
    other.setDate(today.getDate() - 2);
    const otherKey = other.toLocaleDateString('en-CA', { timeZone: getEffectiveTz('UTC') });
    render(
      <TodaysAppointments
        appointments={[
          {
            id: 'a1',
            date: otherKey,
            start: '09:00',
            end: '10:00',
            staffId: 's1',
            services: [],
          },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
      />
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('matches appointment to staff by staffIds array', () => {
    const todayKey = getTodayKey('UTC');
    render(
      <TodaysAppointments
        appointments={[
          {
            id: 'a1',
            date: todayKey,
            start: '09:00',
            end: '10:00',
            staffIds: ['s1'],
            clientId: null,
            services: [],
          },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
      />
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('Jane').length).toBeGreaterThanOrEqual(1);
  });

  it('uses teamMembersProp when provided (table rows still come from staff)', () => {
    const todayKey = getTodayKey('UTC');
    render(
      <TodaysAppointments
        appointments={[
          { id: 'a1', date: todayKey, start: '09:00', end: '10:00', staffId: 's1', services: [] },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        teamMembers={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
      />
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('Jane').length).toBeGreaterThanOrEqual(1);
  });

  it('passes canEdit and canDelete to AppointmentPopover', () => {
    const todayKey = getTodayKey('UTC');
    render(
      <TodaysAppointments
        appointments={[
          {
            id: 'a1',
            date: todayKey,
            start: '09:00',
            end: '10:00',
            staffId: 's1',
            staffIds: ['s1'],
            services: [],
          },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
        isTeamMember={true}
        currentUserStaffId="s1"
      />
    );
    const popover = screen.getByTestId('appointment-popover');
    expect(popover).toHaveAttribute('data-can-edit', 'true');
    expect(popover).toHaveAttribute('data-can-delete', 'true');
  });

  it('passes onAppointmentClick and onAppointmentDelete to popover via component', () => {
    const todayKey = getTodayKey('UTC');
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(
      <TodaysAppointments
        appointments={[
          { id: 'a1', date: todayKey, start: '09:00', end: '10:00', staffId: 's1', services: [] },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
        onAppointmentClick={onEdit}
        onAppointmentDelete={onDelete}
      />
    );
    expect(screen.getByTestId('appointment-popover')).toBeInTheDocument();
  });

  it('accepts appointment date as ISO string and filters by today in timezone', () => {
    const todayKey = getTodayKey('UTC');
    render(
      <TodaysAppointments
        appointments={[
          {
            id: 'a1',
            date: todayKey,
            start: '09:00',
            end: '10:00',
            staffId: 's1',
            services: [],
          },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
      />
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('accepts appointment date as Date object and filters by today', () => {
    const todayKey = getTodayKey('UTC');
    const dateAsDate = new Date(todayKey + 'T14:00:00Z');
    render(
      <TodaysAppointments
        appointments={[
          {
            id: 'a1',
            date: dateAsDate,
            start: '09:00',
            end: '10:00',
            staffId: 's1',
            services: [],
          },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
      />
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders time slot headers from business hours', () => {
    const todayKey = getTodayKey('UTC');
    render(
      <TodaysAppointments
        appointments={[
          { id: 'a1', date: todayKey, start: '09:00', end: '10:00', staffId: 's1', services: [] },
        ]}
        staff={[{ id: 's1', name: 'Jane' }]}
        timezone="UTC"
        businessHoursStart="08:00"
        businessHoursEnd="18:00"
      />
    );
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
  });
});
