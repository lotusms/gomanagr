/**
 * Unit tests for MessageLogCards:
 * - Renders a card per message with channel, direction, date, author, body (clipBody)
 * - CHANNEL_LABELS (SMS, Chat, Other) and channelLabel fallback
 * - author fallback to em dash; clipBody and empty body
 * - borderClass, onSelect (click + Enter/Space), onDelete
 * - Account fallbacks for dateFormat, timeFormat, timezone
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageLogCards from '@/components/clients/add-client/MessageLogCards';

const mockUseOptionalUserAccount = jest.fn(() => ({ dateFormat: 'MM/DD/YYYY', timeFormat: '24h', timezone: 'UTC' }));
jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => mockUseOptionalUserAccount(),
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDateTimeFromISO: (iso, dateFormat, timeFormat, timezone) => (iso ? '01/15/2026, 2:30 PM' : '—'),
}));

describe('MessageLogCards', () => {
  const messages = [
    {
      id: 'msg1',
      channel: 'sms',
      direction: 'inbound',
      sent_at: '2026-01-15T14:30:00Z',
      author: 'Jane Doe',
      body: 'Hello, when can we schedule a call?',
    },
    {
      id: 'msg2',
      channel: 'chat',
      direction: 'outbound',
      sent_at: '2026-01-16T10:00:00Z',
      author: null,
      body: 'Line one\nLine two\nLine three\nLine four',
    },
  ];

  it('renders a card per message with channel, direction, date, author, and body', () => {
    render(<MessageLogCards messages={messages} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('inbound')).toBeInTheDocument();
    expect(screen.getByText('outbound')).toBeInTheDocument();
    expect(screen.getAllByText('01/15/2026, 2:30 PM').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText(/Hello, when can we schedule/)).toBeInTheDocument();
  });

  it('shows author or em dash when author is missing', () => {
    render(<MessageLogCards messages={messages} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows channel label from CHANNEL_LABELS (SMS, Chat) and Other for unknown', () => {
    const withOther = [
      { id: 'o1', channel: 'other', direction: 'inbound', sent_at: '2026-01-01T12:00:00Z', author: 'A', body: 'B' },
      { id: 'o2', channel: 'unknown', direction: 'outbound', sent_at: '2026-01-01T12:00:00Z', author: 'A', body: 'B' },
    ];
    render(<MessageLogCards messages={withOther} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getAllByText('Other').length).toBe(2);
  });

  it('clips body to 3 lines and adds ellipsis when longer', () => {
    render(<MessageLogCards messages={messages} onSelect={() => {}} onDelete={() => {}} />);
    const p = screen.getByText((content, el) => el?.tagName === 'P' && content.includes('Line one') && content.includes('…'));
    expect(p).toBeInTheDocument();
  });

  it('handles message with empty body (clipBody returns empty string)', () => {
    const emptyBody = [
      { id: 'e1', channel: 'sms', direction: 'inbound', sent_at: '2026-01-01T12:00:00Z', author: 'Agent', body: '' },
    ];
    render(<MessageLogCards messages={emptyBody} onSelect={() => {}} onDelete={() => {}} />);
    const card = screen.getByText('Agent').closest('[role="button"]');
    expect(card).toBeInTheDocument();
    const paras = card.querySelectorAll('p');
    const bodyPara = Array.from(paras).find((p) => p.className.includes('line-clamp-3'));
    expect(bodyPara).toHaveTextContent('');
  });

  it('calls onSelect with message id when card is clicked', async () => {
    const onSelect = jest.fn();
    render(<MessageLogCards messages={messages} onSelect={onSelect} onDelete={() => {}} />);
    await userEvent.click(screen.getByText('Jane Doe').closest('[role="button"]'));
    expect(onSelect).toHaveBeenCalledWith('msg1');
  });

  it('calls onSelect when card receives Enter key', () => {
    const onSelect = jest.fn();
    render(<MessageLogCards messages={messages} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText('Jane Doe').closest('[role="button"]');
    fireEvent.keyDown(card, { key: 'Enter', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('msg1');
  });

  it('calls onSelect when card receives Space key', () => {
    const onSelect = jest.fn();
    render(<MessageLogCards messages={messages} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText('Jane Doe').closest('[role="button"]');
    fireEvent.keyDown(card, { key: ' ', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('msg1');
  });

  it('calls onDelete with message id when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(<MessageLogCards messages={messages} onSelect={() => {}} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete message' });
    await userEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledWith('msg2');
  });

  it('applies borderClass when provided', () => {
    const { container } = render(
      <MessageLogCards
        messages={[messages[0]]}
        borderClass="border-l-green-500"
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    const card = container.querySelector('.border-l-green-500');
    expect(card).toBeInTheDocument();
  });

  it('renders empty grid when messages is empty', () => {
    const { container } = render(<MessageLogCards messages={[]} onSelect={() => {}} onDelete={() => {}} />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid.children.length).toBe(0);
  });

  it('uses fallback dateFormat and timezone when account is null', () => {
    mockUseOptionalUserAccount.mockReturnValueOnce(null);
    render(<MessageLogCards messages={[messages[0]]} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('01/15/2026, 2:30 PM')).toBeInTheDocument();
  });

  it('renders time element with dateTime attribute', () => {
    render(<MessageLogCards messages={[messages[0]]} onSelect={() => {}} onDelete={() => {}} />);
    const timeEl = document.querySelector('time[datetime="2026-01-15T14:30:00Z"]');
    expect(timeEl).toBeInTheDocument();
    expect(timeEl).toHaveTextContent('01/15/2026, 2:30 PM');
  });
});
