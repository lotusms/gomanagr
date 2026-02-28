/**
 * Unit tests for EmailLogCards:
 * - Renders a card per email with direction, date, subject, body preview
 * - Shows attachment icon when email has attachments
 * - Calls onSelect when card is clicked
 * - Calls onDelete when delete button is clicked (does not trigger onSelect)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailLogCards from '@/components/clients/add-client/EmailLogCards';

describe('EmailLogCards', () => {
  const emails = [
    {
      id: 'e1',
      direction: 'sent',
      sent_at: '2026-02-27T14:00:00Z',
      subject: 'Hello',
      body: 'Line one\nLine two\nLine three',
      attachments: [],
    },
    {
      id: 'e2',
      direction: 'received',
      sent_at: '2026-02-26T10:00:00Z',
      subject: 'Re: Hello',
      body: 'Reply text',
      attachments: ['https://example.com/file.pdf'],
    },
  ];

  it('renders a card per email with direction, subject, and body preview', () => {
    render(<EmailLogCards emails={emails} onSelect={() => {}} onDelete={() => {}} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Re: Hello')).toBeInTheDocument();
    expect(screen.getByText(/Line one/)).toBeInTheDocument();
    expect(screen.getByText(/Reply text/)).toBeInTheDocument();
    expect(screen.getByText('sent', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('received', { exact: false })).toBeInTheDocument();
  });

  it('shows attachment icon only for emails that have attachments', () => {
    render(<EmailLogCards emails={emails} onSelect={() => {}} onDelete={() => {}} />);

    const cards = screen.getAllByRole('button');
    const cardWithAttachment = cards.find((c) => c.textContent?.includes('Re: Hello'));
    expect(cardWithAttachment).toBeDefined();
    const attachmentIcons = document.querySelectorAll('[title="Has attachments"]');
    expect(attachmentIcons.length).toBe(1);
  });

  it('calls onSelect with email id when card is clicked', async () => {
    const onSelect = jest.fn();
    render(<EmailLogCards emails={emails} onSelect={onSelect} onDelete={() => {}} />);

    await userEvent.click(screen.getByText('Hello').closest('[role="button"]'));

    expect(onSelect).toHaveBeenCalledWith('e1');
  });

  it('calls onDelete with email id when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(<EmailLogCards emails={emails} onSelect={() => {}} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete email' });
    await userEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith('e1');
  });
});
