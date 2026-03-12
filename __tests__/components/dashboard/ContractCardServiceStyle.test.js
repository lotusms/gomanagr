/**
 * Unit tests for ContractCardServiceStyle
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContractCardServiceStyle from '@/components/dashboard/ContractCardServiceStyle';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDateFromISO: (d) => (d ? new Date(d).toLocaleDateString() : '—'),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'contract' ? 'Contract' : t),
}));

describe('ContractCardServiceStyle', () => {
  const contract = {
    id: 'c1',
    contract_title: 'Service Agreement',
    status: 'active',
    start_date: '2026-02-01',
  };

  it('renders contract title', () => {
    render(
      <ContractCardServiceStyle contract={contract} onSelect={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText('Service Agreement')).toBeInTheDocument();
  });

  it('renders Untitled contract when contract_title is empty', () => {
    render(
      <ContractCardServiceStyle
        contract={{ ...contract, contract_title: '' }}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText(/Untitled contract/)).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', () => {
    const onSelect = jest.fn();
    render(
      <ContractCardServiceStyle contract={contract} onSelect={onSelect} onDelete={() => {}} />
    );
    fireEvent.click(screen.getByText('Service Agreement').closest('[role="button"]'));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = jest.fn();
    render(
      <ContractCardServiceStyle contract={contract} onSelect={() => {}} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByTitle(/Delete contract/i));
    expect(onDelete).toHaveBeenCalledWith('c1');
  });
});
