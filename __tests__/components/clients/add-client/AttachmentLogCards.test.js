/**
 * Unit tests for AttachmentLogCards:
 * - Renders a card per attachment with file name, type, category
 * - Calls onSelect when card is clicked
 * - Calls onDelete when delete button is clicked
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttachmentLogCards from '@/components/clients/add-client/AttachmentLogCards';

describe('AttachmentLogCards', () => {
  const attachments = [
    {
      id: 'a1',
      file_name: 'contract-signed.pdf',
      file_type: 'PDF',
      category: 'signed_paperwork',
      upload_date: '2026-02-27',
      description: 'Signed agreement',
    },
    {
      id: 'a2',
      file_name: 'logo.png',
      file_type: 'PNG',
      category: 'logos_brand_assets',
      created_at: '2026-02-26T12:00:00Z',
      description: '',
    },
  ];

  it('renders a card per attachment with file name, type, and category', () => {
    render(<AttachmentLogCards attachments={attachments} onSelect={() => {}} onDelete={() => {}} />);

    expect(screen.getByText('contract-signed.pdf')).toBeInTheDocument();
    expect(screen.getByText('logo.png')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('Signed paperwork')).toBeInTheDocument();
    expect(screen.getByText('Logos / brand')).toBeInTheDocument();
  });

  it('calls onSelect with attachment id when card is clicked', async () => {
    const onSelect = jest.fn();
    render(<AttachmentLogCards attachments={attachments} onSelect={onSelect} onDelete={() => {}} />);

    await userEvent.click(screen.getByText('contract-signed.pdf').closest('[role="button"]'));

    expect(onSelect).toHaveBeenCalledWith('a1');
  });

  it('calls onDelete with attachment id when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(<AttachmentLogCards attachments={attachments} onSelect={() => {}} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete attachment' });
    await userEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith('a1');
  });
});
