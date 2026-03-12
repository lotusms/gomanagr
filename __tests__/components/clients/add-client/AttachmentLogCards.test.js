/**
 * Unit tests for AttachmentLogCards:
 * - Renders a card per attachment with file name and type
 * - Calls onSelect when card is clicked
 * - Calls onDelete when delete button is clicked
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('strips upload prefix from file name and shows actual filename (e.g. TEST.pdf)', () => {
    const withPrefixedName = [
      {
        id: 'a1',
        file_name: '1772380654927-4ox18iujs-TEST.pdf',
        file_type: 'pdf',
        upload_date: '2026-03-01',
      },
    ];
    render(<AttachmentLogCards attachments={withPrefixedName} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('TEST.pdf')).toBeInTheDocument();
    expect(screen.queryByText(/1772380654927-4ox18iujs-TEST\.pdf/)).not.toBeInTheDocument();
  });

  it('uses file_url path segment when file_name is empty and strips prefix', () => {
    const withUrlOnly = [
      {
        id: 'a1',
        file_name: '',
        file_url: 'https://example.com/uploads/1772380654927-4ox18iujs-Report.pdf',
        file_type: 'pdf',
      },
    ];
    render(<AttachmentLogCards attachments={withUrlOnly} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Report.pdf')).toBeInTheDocument();
  });

  it('falls back to Unnamed file when file_url is invalid and throws in URL parse', () => {
    const invalidUrl = [
      { id: 'a1', file_name: '', file_url: 'http://', file_type: 'pdf' },
    ];
    render(<AttachmentLogCards attachments={invalidUrl} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Unnamed file')).toBeInTheDocument();
  });

  it('uses file_url as string when it does not start with http', () => {
    const withRelativeUrl = [
      { id: 'a1', file_name: '', file_url: '/uploads/doc.pdf', file_type: 'PDF' },
    ];
    render(<AttachmentLogCards attachments={withRelativeUrl} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('/uploads/doc.pdf')).toBeInTheDocument();
  });

  it('calls onSelect when card receives Enter key', () => {
    const onSelect = jest.fn();
    render(<AttachmentLogCards attachments={attachments} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText('contract-signed.pdf').closest('[role="button"]');
    fireEvent.keyDown(card, { key: 'Enter', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('a1');
  });

  it('calls onSelect when card receives Space key', () => {
    const onSelect = jest.fn();
    render(<AttachmentLogCards attachments={attachments} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText('logo.png').closest('[role="button"]');
    fireEvent.keyDown(card, { key: ' ', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('a2');
  });

  it('uses contractTermSingularLower in linked contract label', () => {
    const withContract = [
      {
        id: 'a1',
        file_name: 'x.pdf',
        linked_contract_id: 'cid-1',
        linked_contract: { contract_number: '', contract_title: '' },
      },
    ];
    render(
      <AttachmentLogCards
        attachments={withContract}
        onSelect={() => {}}
        onDelete={() => {}}
        clientId="c1"
        contractTermSingularLower="agreement"
      />
    );
    const link = screen.getByRole('link', { name: /View agreement/i });
    expect(link).toBeInTheDocument();
  });
});
