/**
 * Unit tests for AttachmentLogCards:
 * - Renders a card per attachment with file name and type
 * - Calls onSelect when card is clicked
 * - Calls onDelete when delete button is clicked
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttachmentLogCards from '@/components/clients/add-client/AttachmentLogCards';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

describe('AttachmentLogCards', () => {
  const attachments = [
    {
      id: 'a1',
      file_name: 'contract-signed.pdf',
      file_type: 'PDF',
      upload_date: '2026-02-27',
      description: 'Signed agreement',
    },
    {
      id: 'a2',
      file_name: 'logo.png',
      file_type: 'PNG',
      created_at: '2026-02-26T12:00:00Z',
      description: '',
    },
  ];

  it('renders a card per attachment with file name and type', () => {
    render(<AttachmentLogCards attachments={attachments} onSelect={() => {}} onDelete={() => {}} />);

    expect(screen.getByText('contract-signed.pdf')).toBeInTheDocument();
    expect(screen.getByText('logo.png')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
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

  it('renders linked contract link when clientId and linked_contract_id are provided', () => {
    const withContract = [
      {
        id: 'a1',
        file_name: 'signed.pdf',
        file_type: 'pdf',
        linked_contract_id: 'contract-uuid-1',
        linked_contract: { id: 'contract-uuid-1', contract_number: 'CON-001', contract_title: 'Service Agreement' },
      },
    ];
    render(
      <AttachmentLogCards
        attachments={withContract}
        onSelect={() => {}}
        onDelete={() => {}}
        clientId="client-123"
      />
    );
    const link = screen.getByRole('link', { name: /Linked contract: CON-001 – Service Agreement/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard/clients/client-123/contracts/contract-uuid-1/edit');
  });

  it('renders "View contract" link when linked_contract_id set but no linked_contract details', () => {
    const withContractIdOnly = [
      { id: 'a1', file_name: 'doc.pdf', linked_contract_id: 'cid-1', linked_contract: null },
    ];
    render(
      <AttachmentLogCards
        attachments={withContractIdOnly}
        onSelect={() => {}}
        onDelete={() => {}}
        clientId="client-1"
      />
    );
    const link = screen.getByRole('link', { name: /View contract/i });
    expect(link).toHaveAttribute('href', '/dashboard/clients/client-1/contracts/cid-1/edit');
  });
});
