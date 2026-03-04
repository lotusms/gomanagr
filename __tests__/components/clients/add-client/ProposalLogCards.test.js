/**
 * Unit tests for ProposalLogCards:
 * - Renders a card per proposal with number, status, date, title
 * - Calls onSelect when card is clicked
 * - Calls onDelete when delete button is clicked
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProposalLogCards from '@/components/clients/add-client/ProposalLogCards';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

describe('ProposalLogCards', () => {
  const proposals = [
    {
      id: 'p1',
      proposal_number: 'P-001',
      status: 'draft',
      date_created: '2026-02-27',
      proposal_title: 'Website Redesign',
      scope_summary: 'Full redesign.',
    },
    {
      id: 'p2',
      proposal_number: 'P-002',
      status: 'sent',
      date_created: '2026-02-26',
      proposal_title: 'Marketing Retainer',
      scope_summary: '',
    },
  ];

  it('renders a card per proposal with number, status, and title', () => {
    render(<ProposalLogCards proposals={proposals} onSelect={() => {}} onDelete={() => {}} />);

    expect(screen.getByText('Website Redesign')).toBeInTheDocument();
    expect(screen.getByText('Marketing Retainer')).toBeInTheDocument();
    expect(screen.getByText('P-001')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });

  it('calls onSelect with proposal id when card is clicked', async () => {
    const onSelect = jest.fn();
    render(<ProposalLogCards proposals={proposals} onSelect={onSelect} onDelete={() => {}} />);

    await userEvent.click(screen.getByText('Website Redesign').closest('[role="button"]'));

    expect(onSelect).toHaveBeenCalledWith('p1');
  });

  it('calls onDelete with proposal id when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(<ProposalLogCards proposals={proposals} onSelect={() => {}} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete proposal' });
    await userEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith('p1');
  });
});
