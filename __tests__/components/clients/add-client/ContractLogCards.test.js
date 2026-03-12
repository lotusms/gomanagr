/**
 * Unit tests for ContractLogCards:
 * - Renders a card per contract with number, status, title, value
 * - When clientId and attachments provided, shows linked attachments with links to edit attachment
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
      status: 'completed',
      start_date: '2026-02-27',
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
    expect(screen.getByText('Completed')).toBeInTheDocument();
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

  it('calls onSelect when card is activated with Enter key', () => {
    const onSelect = jest.fn();
    render(<ContractLogCards contracts={contracts} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText('Service Agreement').closest('[role="button"]');
    card.focus();
    fireEvent.keyDown(card, { key: 'Enter', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('shows related proposal when provided', () => {
    const withProposal = [
      {
        id: 'c3',
        contract_title: 'From Quote',
        related_proposal: { proposal_number: 'Q-1', proposal_title: 'Q1 Quote' },
      },
    ];
    render(<ContractLogCards contracts={withProposal} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/From proposal: Q-1 – Q1 Quote/)).toBeInTheDocument();
  });

  it('shows contract value when set', () => {
    render(<ContractLogCards contracts={contracts} onSelect={() => {}} onDelete={() => {}} defaultCurrency="USD" />);
    expect(screen.getByText(/Value:.*\$5,000\.00/)).toBeInTheDocument();
  });

  it('clips scope_summary to 3 lines with ellipsis', () => {
    const withScope = [
      { id: 'c4', contract_title: 'Scoped', scope_summary: 'Line1\nLine2\nLine3\nLine4\nLine5' },
    ];
    render(<ContractLogCards contracts={withScope} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/Line1/)).toBeInTheDocument();
    expect(screen.getByText(/…/)).toBeInTheDocument();
  });

  it('shows Unnamed file when attachment has no file_name', () => {
    const attachments = [{ id: 'a1', file_name: '', linked_contract_id: 'c1' }];
    render(
      <ContractLogCards
        contracts={contracts}
        attachments={attachments}
        clientId="client-99"
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByRole('link', { name: 'Unnamed file' })).toBeInTheDocument();
  });
});
