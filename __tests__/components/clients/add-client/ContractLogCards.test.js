/**
 * Unit tests for ContractLogCards:
 * - Renders a card per contract with number, status, title, value
 * - When clientId and attachments provided, shows linked attachments with links to edit attachment
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContractLogCards from '@/components/clients/add-client/ContractLogCards';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

describe('ContractLogCards', () => {
  const contracts = [
    {
      id: 'c1',
      contract_number: 'CON-001',
      contract_title: 'Service Agreement',
      status: 'signed',
      effective_date: '2026-02-27',
      contract_value: 5000,
    },
    {
      id: 'c2',
      contract_number: 'CON-002',
      contract_title: 'NDA',
      status: 'draft',
      contract_value: null,
    },
  ];

  it('renders a card per contract with number, status, and title', () => {
    render(<ContractLogCards contracts={contracts} onSelect={() => {}} onDelete={() => {}} />);

    expect(screen.getByText('Service Agreement')).toBeInTheDocument();
    expect(screen.getByText('NDA')).toBeInTheDocument();
    expect(screen.getByText('CON-001')).toBeInTheDocument();
    expect(screen.getByText('CON-002')).toBeInTheDocument();
    expect(screen.getByText('Signed')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows linked attachments with link to attachment when clientId and attachments provided', () => {
    const attachments = [
      { id: 'att1', file_name: 'signed-agreement.pdf', linked_contract_id: 'c1' },
      { id: 'att2', file_name: 'exhibit-a.pdf', linked_contract_id: 'c1' },
    ];
    render(
      <ContractLogCards
        contracts={contracts}
        attachments={attachments}
        clientId="client-99"
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText('Linked attachments:')).toBeInTheDocument();
    const link1 = screen.getByRole('link', { name: 'signed-agreement.pdf' });
    const link2 = screen.getByRole('link', { name: 'exhibit-a.pdf' });
    expect(link1).toHaveAttribute('href', '/dashboard/clients/client-99/attachments/att1/edit');
    expect(link2).toHaveAttribute('href', '/dashboard/clients/client-99/attachments/att2/edit');
  });

  it('does not show linked attachments section when no attachments link to the contract', () => {
    const attachments = [{ id: 'att1', file_name: 'other.pdf', linked_contract_id: 'c2' }];
    render(
      <ContractLogCards
        contracts={contracts}
        attachments={attachments}
        clientId="client-99"
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );

    // CON-001 card should not have "Linked attachments" (only c2 has one)
    const linkedLabels = screen.getAllByText('Linked attachments:');
    expect(linkedLabels).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'other.pdf' })).toHaveAttribute('href', '/dashboard/clients/client-99/attachments/att1/edit');
  });

  it('calls onSelect with contract id when card is clicked', async () => {
    const onSelect = jest.fn();
    render(<ContractLogCards contracts={contracts} onSelect={onSelect} onDelete={() => {}} />);

    await userEvent.click(screen.getByText('Service Agreement').closest('[role="button"]'));

    expect(onSelect).toHaveBeenCalledWith('c1');
  });
});
