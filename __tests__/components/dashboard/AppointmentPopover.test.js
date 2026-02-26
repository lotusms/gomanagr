/**
 * Unit tests for AppointmentPopover:
 * - Renders trigger with title and time (or custom children)
 * - Shows popover content on hover (title, team member, time, service, client, notes)
 * - Clicking trigger or popover calls onOpenEdit with appointment
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AppointmentPopover from '@/components/dashboard/AppointmentPopover';

const defaultAppointment = {
  id: 'apt-1',
  title: 'Team standup',
  staffId: 'tm1',
  date: '2026-02-24',
  start: '09:00',
  end: '09:30',
  services: ['Consultation'],
  clientId: 'c1',
  label: 'Weekly sync. Bring updates.',
};

const teamMembers = [
  { id: 'tm1', name: 'Alice' },
  { id: 'tm2', name: 'Bob' },
];

const clients = [
  { id: 'c1', name: 'Acme Corp', company: 'Acme' },
  { id: 'c2', name: 'Jane Doe' },
];

describe('AppointmentPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger with appointment title and time range', () => {
    render(
      <AppointmentPopover
        appointment={defaultAppointment}
        teamMembers={teamMembers}
        clients={clients}
        timeFormat="24h"
        onOpenEdit={jest.fn()}
      />
    );

    expect(screen.getByText('Team standup')).toBeInTheDocument();
    expect(screen.getByText(/09:00.*09:30/)).toBeInTheDocument();
  });

  it('uses custom children when provided', () => {
    render(
      <AppointmentPopover
        appointment={defaultAppointment}
        teamMembers={teamMembers}
        clients={clients}
        onOpenEdit={jest.fn()}
      >
        <span data-testid="custom-trigger">Custom label</span>
      </AppointmentPopover>
    );

    expect(screen.getByTestId('custom-trigger')).toHaveTextContent('Custom label');
    expect(screen.queryByText('Team standup')).not.toBeInTheDocument();
  });

  it('calls onOpenEdit with appointment when trigger is clicked', () => {
    const onOpenEdit = jest.fn();
    render(
      <AppointmentPopover
        appointment={defaultAppointment}
        teamMembers={teamMembers}
        clients={clients}
        onOpenEdit={onOpenEdit}
      />
    );

    fireEvent.click(screen.getByText('Team standup'));
    expect(onOpenEdit).toHaveBeenCalledTimes(1);
    expect(onOpenEdit).toHaveBeenCalledWith(defaultAppointment);
  });

  it('shows Untitled when appointment has no title', () => {
    render(
      <AppointmentPopover
        appointment={{ ...defaultAppointment, title: '' }}
        teamMembers={teamMembers}
        clients={clients}
        onOpenEdit={jest.fn()}
      />
    );

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('shows popover content on hover with title, team member, time, service, client, notes', async () => {
    render(
      <AppointmentPopover
        appointment={defaultAppointment}
        teamMembers={teamMembers}
        clients={clients}
        timeFormat="24h"
        onOpenEdit={jest.fn()}
      />
    );

    const trigger = screen.getByText('Team standup').closest('div');
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /appointment details/i })).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog', { name: /appointment details/i });
    expect(within(dialog).getByText('Team standup')).toBeInTheDocument();
    expect(within(dialog).getByText('Alice')).toBeInTheDocument();
    expect(within(dialog).getByText(/09:00.*09:30/)).toBeInTheDocument();
    expect(within(dialog).getByText('Consultation')).toBeInTheDocument();
    expect(within(dialog).getByText(/Acme Corp/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Weekly sync/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Click to edit/)).toBeInTheDocument();
  });

  it('calls onOpenEdit when popover is clicked', async () => {
    const onOpenEdit = jest.fn();
    render(
      <AppointmentPopover
        appointment={defaultAppointment}
        teamMembers={teamMembers}
        clients={clients}
        onOpenEdit={onOpenEdit}
      />
    );

    const trigger = screen.getByText('Team standup').closest('div');
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /appointment details/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('dialog', { name: /appointment details/i }));
    expect(onOpenEdit).toHaveBeenCalledWith(defaultAppointment);
  });

  it('renders without teamMembers or clients', () => {
    render(
      <AppointmentPopover
        appointment={defaultAppointment}
        teamMembers={[]}
        clients={[]}
        onOpenEdit={jest.fn()}
      />
    );

    expect(screen.getByText('Team standup')).toBeInTheDocument();
  });
});
