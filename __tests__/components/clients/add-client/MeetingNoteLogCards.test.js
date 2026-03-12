/**
 * Unit tests for MeetingNoteLogCards:
 * - Renders a card per note with meeting date, title, location_zoom_link, notes (clipText)
 * - Untitled meeting fallback; optional location; clipText and empty notes
 * - borderClass, onSelect (click + Enter/Space), onDelete
 * - Account fallbacks for dateFormat, timeFormat, timezone
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MeetingNoteLogCards from '@/components/clients/add-client/MeetingNoteLogCards';

const mockUseOptionalUserAccount = jest.fn(() => ({ dateFormat: 'MM/DD/YYYY', timeFormat: '24h', timezone: 'UTC' }));
jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => mockUseOptionalUserAccount(),
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDateTimeFromISO: (iso, dateFormat, timeFormat, timezone) => (iso ? '01/15/2026, 2:30 PM' : '—'),
}));

describe('MeetingNoteLogCards', () => {
  const notes = [
    {
      id: 'm1',
      meeting_at: '2026-01-15T14:30:00Z',
      title: 'Kickoff call',
      location_zoom_link: 'https://zoom.us/j/123',
      notes: 'Agenda: scope and timeline.\nNext steps agreed.',
    },
    {
      id: 'm2',
      meeting_at: '2026-01-20T10:00:00Z',
      title: null,
      location_zoom_link: null,
      notes: 'Follow-up.',
    },
  ];

  it('renders a card per note with meeting date, title, and notes', () => {
    render(<MeetingNoteLogCards notes={notes} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getAllByText('01/15/2026, 2:30 PM').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Kickoff call')).toBeInTheDocument();
    expect(screen.getByText('https://zoom.us/j/123')).toBeInTheDocument();
    expect(screen.getByText(/Agenda: scope and timeline/)).toBeInTheDocument();
    expect(screen.getByText(/Next steps agreed/)).toBeInTheDocument();
    expect(screen.getByText('Follow-up.')).toBeInTheDocument();
  });

  it('shows Untitled meeting when title is missing', () => {
    render(<MeetingNoteLogCards notes={notes} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Untitled meeting')).toBeInTheDocument();
  });

  it('shows location_zoom_link when present', () => {
    render(<MeetingNoteLogCards notes={[notes[0]]} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('https://zoom.us/j/123')).toBeInTheDocument();
  });

  it('does not show location line when location_zoom_link is missing', () => {
    render(<MeetingNoteLogCards notes={[notes[1]]} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Follow-up.')).toBeInTheDocument();
    expect(screen.queryByText('https://zoom.us/j/123')).not.toBeInTheDocument();
  });

  it('clips notes to 3 lines and adds ellipsis when longer', () => {
    const longNotes = [
      {
        id: 'long',
        meeting_at: '2026-01-01T12:00:00Z',
        title: 'Long',
        location_zoom_link: null,
        notes: 'Line one\nLine two\nLine three\nLine four',
      },
    ];
    render(<MeetingNoteLogCards notes={longNotes} onSelect={() => {}} onDelete={() => {}} />);
    const p = screen.getByText((content, el) => el?.tagName === 'P' && content.includes('Line one') && content.includes('…'));
    expect(p).toBeInTheDocument();
  });

  it('handles note with empty notes (clipText returns empty string)', () => {
    const emptyNotes = [
      { id: 'e1', meeting_at: '2026-01-01T12:00:00Z', title: 'No notes', location_zoom_link: null, notes: '' },
    ];
    render(<MeetingNoteLogCards notes={emptyNotes} onSelect={() => {}} onDelete={() => {}} />);
    const card = screen.getByText('No notes').closest('[role="button"]');
    expect(card).toBeInTheDocument();
    const paras = card.querySelectorAll('p');
    const notesPara = Array.from(paras).find((p) => p.className.includes('line-clamp-3'));
    expect(notesPara).toHaveTextContent('');
  });

  it('calls onSelect with note id when card is clicked', async () => {
    const onSelect = jest.fn();
    render(<MeetingNoteLogCards notes={notes} onSelect={onSelect} onDelete={() => {}} />);
    await userEvent.click(screen.getByText('Kickoff call').closest('[role="button"]'));
    expect(onSelect).toHaveBeenCalledWith('m1');
  });

  it('calls onSelect when card receives Enter key', () => {
    const onSelect = jest.fn();
    render(<MeetingNoteLogCards notes={notes} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText('Kickoff call').closest('[role="button"]');
    fireEvent.keyDown(card, { key: 'Enter', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('m1');
  });

  it('calls onSelect when card receives Space key', () => {
    const onSelect = jest.fn();
    render(<MeetingNoteLogCards notes={notes} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText('Kickoff call').closest('[role="button"]');
    fireEvent.keyDown(card, { key: ' ', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('m1');
  });

  it('calls onDelete with note id when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(<MeetingNoteLogCards notes={notes} onSelect={() => {}} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete meeting note' });
    await userEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledWith('m2');
  });

  it('applies borderClass when provided', () => {
    const { container } = render(
      <MeetingNoteLogCards
        notes={[notes[0]]}
        borderClass="border-l-blue-500"
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    const card = container.querySelector('.border-l-blue-500');
    expect(card).toBeInTheDocument();
  });

  it('renders empty grid when notes is empty', () => {
    const { container } = render(<MeetingNoteLogCards notes={[]} onSelect={() => {}} onDelete={() => {}} />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid.children.length).toBe(0);
  });

  it('uses fallback dateFormat and timezone when account is null', () => {
    mockUseOptionalUserAccount.mockReturnValueOnce(null);
    render(<MeetingNoteLogCards notes={[notes[0]]} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('01/15/2026, 2:30 PM')).toBeInTheDocument();
  });

  it('renders time element with dateTime attribute', () => {
    render(<MeetingNoteLogCards notes={[notes[0]]} onSelect={() => {}} onDelete={() => {}} />);
    const timeEl = document.querySelector('time[datetime="2026-01-15T14:30:00Z"]');
    expect(timeEl).toBeInTheDocument();
    expect(timeEl).toHaveTextContent('01/15/2026, 2:30 PM');
  });
});
