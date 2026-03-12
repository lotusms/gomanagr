/**
 * Unit tests for ClientAppointmentsCalendar (year/month view):
 * - Renders month header, weekday labels, day cells
 * - Prev/next month navigation (including year wrap)
 * - Appointments shown on correct dates (string and Date)
 * - onAppointmentClick when clicking an appointment
 * - 12h vs 24h time display; "+N more" when >3 appointments
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ClientAppointmentsCalendar from '@/components/dashboard/ClientAppointmentsCalendar';

jest.mock('react-icons/hi', () => ({
  HiChevronRight: () => <span data-testid="chevron">›</span>,
}));

describe('ClientAppointmentsCalendar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-03-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with default props when no props passed', () => {
    render(<ClientAppointmentsCalendar />);
    expect(screen.getByRole('heading', { name: /March 2025/i })).toBeInTheDocument();
  });

  it('renders current month and year in header', () => {
    render(<ClientAppointmentsCalendar appointments={[]} />);
    expect(screen.getByRole('heading', { name: /March 2025/i })).toBeInTheDocument();
  });

  it('renders weekday headers', () => {
    render(<ClientAppointmentsCalendar appointments={[]} />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders day cells for the month', () => {
    render(<ClientAppointmentsCalendar appointments={[]} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('navigates to previous month when prev button is clicked', () => {
    render(<ClientAppointmentsCalendar appointments={[]} />);
    const chevrons = screen.getAllByTestId('chevron');
    fireEvent.click(chevrons[0].closest('button'));
    expect(screen.getByRole('heading', { name: /February 2025/i })).toBeInTheDocument();
  });

  it('navigates to next month when next button is clicked', () => {
    render(<ClientAppointmentsCalendar appointments={[]} />);
    const chevrons = screen.getAllByTestId('chevron');
    fireEvent.click(chevrons[chevrons.length - 1].closest('button'));
    expect(screen.getByRole('heading', { name: /April 2025/i })).toBeInTheDocument();
  });

  it('wraps to previous year when prev from January', () => {
    jest.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
    render(<ClientAppointmentsCalendar appointments={[]} />);
    expect(screen.getByRole('heading', { name: /January 2025/i })).toBeInTheDocument();
    const chevrons = screen.getAllByTestId('chevron');
    fireEvent.click(chevrons[0].closest('button'));
    expect(screen.getByRole('heading', { name: /December 2024/i })).toBeInTheDocument();
  });

  it('wraps to next year when next from December', () => {
    jest.setSystemTime(new Date('2025-12-15T12:00:00.000Z'));
    render(<ClientAppointmentsCalendar appointments={[]} />);
    const chevrons = screen.getAllByTestId('chevron');
    fireEvent.click(chevrons[chevrons.length - 1].closest('button'));
    expect(screen.getByRole('heading', { name: /January 2026/i })).toBeInTheDocument();
  });

  it('shows appointments on the correct date (string date)', () => {
    const appointments = [
      { id: 'a1', date: '2025-03-10', time: '10:00', services: ['Consultation'] },
    ];
    render(<ClientAppointmentsCalendar appointments={appointments} />);
    expect(screen.getByText(/10:00 - Consultation/i)).toBeInTheDocument();
  });

  it('shows appointments on the correct date (Date object)', () => {
    const appointments = [
      { id: 'a2', date: new Date('2025-03-20T00:00:00.000Z'), time: '14:30', services: ['Follow-up'] },
    ];
    render(<ClientAppointmentsCalendar appointments={appointments} />);
    expect(screen.getByText(/14:30 - Follow-up/i)).toBeInTheDocument();
  });

  it('calls onAppointmentClick when an appointment is clicked', () => {
    const onAppointmentClick = jest.fn();
    const apt = { id: 'a1', date: '2025-03-10', time: '10:00', services: ['Consultation'] };
    render(
      <ClientAppointmentsCalendar appointments={[apt]} onAppointmentClick={onAppointmentClick} />
    );
    fireEvent.click(screen.getByText(/10:00 - Consultation/i));
    expect(onAppointmentClick).toHaveBeenCalledTimes(1);
    expect(onAppointmentClick).toHaveBeenCalledWith(apt);
  });

  it('displays time in 12h format when userAccount.timeFormat is 12h', () => {
    const appointments = [
      { id: 'a1', date: '2025-03-10', time: '14:00', services: ['Consultation'] },
    ];
    render(
      <ClientAppointmentsCalendar
        appointments={appointments}
        userAccount={{ timeFormat: '12h' }}
      />
    );
    expect(screen.getByText(/2:00 PM - Consultation/i)).toBeInTheDocument();
  });

  it('displays time in 24h format when userAccount.timeFormat is 24h', () => {
    const appointments = [
      { id: 'a1', date: '2025-03-10', time: '14:00', services: ['Consultation'] },
    ];
    render(
      <ClientAppointmentsCalendar
        appointments={appointments}
        userAccount={{ timeFormat: '24h' }}
      />
    );
    expect(screen.getByText(/14:00 - Consultation/i)).toBeInTheDocument();
  });

  it('displays 12h midnight as 12 AM', () => {
    const appointments = [
      { id: 'a1', date: '2025-03-10', time: '00:30', services: ['Consultation'] },
    ];
    render(
      <ClientAppointmentsCalendar
        appointments={appointments}
        userAccount={{ timeFormat: '12h' }}
      />
    );
    expect(screen.getByText(/12:30 AM - Consultation/i)).toBeInTheDocument();
  });

  it('shows only first service when appointment has multiple services', () => {
    const appointments = [
      { id: 'a1', date: '2025-03-10', time: '10:00', services: ['Consultation', 'Follow-up'] },
    ];
    render(<ClientAppointmentsCalendar appointments={appointments} />);
    expect(screen.getByText(/10:00 - Consultation/i)).toBeInTheDocument();
  });

  it('shows "+N more" when more than 3 appointments on same day', () => {
    const appointments = [
      { id: 'a1', date: '2025-03-10', time: '09:00', services: ['A'] },
      { id: 'a2', date: '2025-03-10', time: '10:00', services: ['B'] },
      { id: 'a3', date: '2025-03-10', time: '11:00', services: ['C'] },
      { id: 'a4', date: '2025-03-10', time: '12:00', services: ['D'] },
      { id: 'a5', date: '2025-03-10', time: '13:00', services: ['E'] },
    ];
    render(<ClientAppointmentsCalendar appointments={appointments} />);
    expect(screen.getByText(/\+2 more/)).toBeInTheDocument();
  });

  it('displays appointment without time when apt.time is missing', () => {
    const appointments = [
      { id: 'a1', date: '2025-03-10', services: ['Consultation'] },
    ];
    render(<ClientAppointmentsCalendar appointments={appointments} />);
    expect(screen.getByText('Consultation')).toBeInTheDocument();
  });

  it('displays time when appointment has empty services array', () => {
    const appointments = [
      { id: 'a1', date: '2025-03-10', time: '10:00', services: [] },
    ];
    render(<ClientAppointmentsCalendar appointments={appointments} />);
    const appointmentButton = screen.getByRole('button', { name: /10:00/ });
    expect(appointmentButton).toBeInTheDocument();
  });
});
