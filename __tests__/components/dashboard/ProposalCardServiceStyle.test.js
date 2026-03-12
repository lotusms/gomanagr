/**
 * Unit tests for ProposalCardServiceStyle
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProposalCardServiceStyle from '@/components/dashboard/ProposalCardServiceStyle';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDateFromISO: (d) => (d ? new Date(d).toLocaleDateString() : '—'),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'proposal' ? 'Proposal' : t),
}));

jest.mock('@/lib/buildDocumentPayload', () => ({
  buildCompanyForDocument: () => ({}),
  buildProposalDocumentPayload: () => ({}),
}));

describe('ProposalCardServiceStyle', () => {
  const proposal = {
    id: 'prop-1',
    proposal_title: 'Q1 Proposal',
    status: 'draft',
    date_created: '2026-02-01',
  };

  it('renders proposal title', () => {
    render(
      <ProposalCardServiceStyle
        proposal={proposal}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText('Q1 Proposal')).toBeInTheDocument();
  });

  it('renders Untitled proposal when proposal_title is empty', () => {
    render(
      <ProposalCardServiceStyle
        proposal={{ ...proposal, proposal_title: '' }}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText(/Untitled proposal/)).toBeInTheDocument();
  });

  it('calls onSelect when title area is clicked', () => {
    const onSelect = jest.fn();
    render(
      <ProposalCardServiceStyle
        proposal={proposal}
        onSelect={onSelect}
        onDelete={() => {}}
      />
    );
    fireEvent.click(screen.getByText('Q1 Proposal'));
    expect(onSelect).toHaveBeenCalledWith('prop-1');
  });
});
