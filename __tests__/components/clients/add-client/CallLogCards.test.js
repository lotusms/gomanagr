/**
 * Unit tests for CallLogCards
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CallLogCards from '@/components/clients/add-client/CallLogCards';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => ({ dateFormat: 'MM/DD/YYYY', timeFormat: '24h', timezone: 'UTC' }),
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDateTimeFromISO: (iso) => (iso ? new Date(iso).toLocaleString() : '—'),
}));

describe('CallLogCards', () => {
  const calls = [
    {
      id: 'call1',
      direction: 'inbound',
      called_at: '2026-03-01T14:30:00Z',
      duration: '2:15',
      phone_number: '+15551234567',
      summary: 'Discussed project scope.\nFollow up next week.',
    },
    {
      id: 'call2',
      direction: 'outbound',
      called_at: '2026-03-02T10:00:00Z',
      phone_number: '',
      summary: 'Left voicemail.',
    },
  ];

  it('renders a card per call with direction, date, and summary', () => {
    render(<CallLogCards calls={calls} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/inbound/i)).toBeInTheDocument();
    expect(screen.getByText(/outbound/i)).toBeInTheDocument();
    expect(screen.getByText(/Discussed project scope/i)).toBeInTheDocument();
    expect(screen.getByText(/Left voicemail/i)).toBeInTheDocument();
  });

  it('shows phone number or em dash when missing', () => {
    render(<CallLogCards calls={calls} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('+15551234567')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('calls onSelect with call id when card is clicked', async () => {
    const onSelect = jest.fn();
    render(<CallLogCards calls={calls} onSelect={onSelect} onDelete={() => {}} />);
    await userEvent.click(screen.getByText(/inbound/i).closest('[role="button"]'));
    expect(onSelect).toHaveBeenCalledWith('call1');
  });

  it('calls onSelect when card receives Enter key', () => {
    const onSelect = jest.fn();
    render(<CallLogCards calls={calls} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText(/outbound/i).closest('[role="button"]');
    fireEvent.keyDown(card, { key: 'Enter', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('call2');
  });

  it('calls onSelect when card receives Space key', () => {
    const onSelect = jest.fn();
    render(<CallLogCards calls={calls} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText(/inbound/i).closest('[role="button"]');
    fireEvent.keyDown(card, { key: ' ', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('call1');
  });

  it('calls onDelete with call id when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(<CallLogCards calls={calls} onSelect={() => {}} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete call' });
    await userEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledWith('call2');
  });

  it('applies borderClass when provided', () => {
    const { container } = render(
      <CallLogCards calls={calls} onSelect={() => {}} onDelete={() => {}} borderClass="border-l-primary-500" />
    );
    const card = container.querySelector('.border-l-primary-500');
    expect(card).toBeInTheDocument();
  });

  it('clips summary to 3 lines with ellipsis', () => {
    const longSummary = [
      {
        id: 'c1',
        direction: 'inbound',
        called_at: '2026-03-01T12:00:00Z',
        summary: 'Line one\nLine two\nLine three\nLine four\nLine five',
      },
    ];
    render(<CallLogCards calls={longSummary} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/Line one/)).toBeInTheDocument();
    expect(screen.getByText(/Line three/)).toBeInTheDocument();
    expect(screen.getByText(/…/)).toBeInTheDocument();
    expect(screen.queryByText(/Line four/)).not.toBeInTheDocument();
  });
});
