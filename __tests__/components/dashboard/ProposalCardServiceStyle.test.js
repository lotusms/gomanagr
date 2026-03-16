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

jest.mock('@/components/documents', () => ({
  DocumentViewDialog: ({ isOpen, onClose, documentTypeLabel, autoPrint }) =>
    isOpen ? (
      <div data-testid="document-view-dialog">
        <span>{documentTypeLabel}</span>
        {autoPrint && <span data-testid="auto-print">auto</span>}
        <button type="button" onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

describe('ProposalCardServiceStyle', () => {
  const proposal = {
    id: 'prop-1',
    proposal_title: 'Q1 Proposal',
    status: 'draft',
    date_created: '2026-02-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('calls onSelect on Enter key on header', () => {
    const onSelect = jest.fn();
    render(
      <ProposalCardServiceStyle proposal={proposal} onSelect={onSelect} onDelete={() => {}} />
    );
    const headerButton = screen.getByText('Q1 Proposal').closest('[role="button"]');
    fireEvent.keyDown(headerButton, { key: 'Enter', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('prop-1');
  });

  it('calls onSelect on Space key on header', () => {
    const onSelect = jest.fn();
    render(
      <ProposalCardServiceStyle proposal={proposal} onSelect={onSelect} onDelete={() => {}} />
    );
    const headerButton = screen.getByText('Q1 Proposal').closest('[role="button"]');
    fireEvent.keyDown(headerButton, { key: ' ', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('prop-1');
  });

  it('calls onDelete when Delete button is clicked', () => {
    const onDelete = jest.fn();
    render(
      <ProposalCardServiceStyle proposal={proposal} onSelect={() => {}} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByTitle(/Delete proposal/i));
    expect(onDelete).toHaveBeenCalledWith('prop-1');
  });

  it('opens menu and View proposal opens DocumentViewDialog without autoPrint', () => {
    render(
      <ProposalCardServiceStyle proposal={proposal} onSelect={() => {}} onDelete={() => {}} />
    );
    fireEvent.click(screen.getByTitle('More actions'));
    const viewItem = document.body.querySelectorAll('[role="menuitem"]')[0];
    expect(viewItem).toHaveTextContent('View proposal');
    fireEvent.click(viewItem);
    expect(screen.getByTestId('document-view-dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('auto-print')).not.toBeInTheDocument();
  });

  it('opens menu and Print proposal opens DocumentViewDialog with autoPrint', () => {
    render(
      <ProposalCardServiceStyle proposal={proposal} onSelect={() => {}} onDelete={() => {}} />
    );
    fireEvent.click(screen.getByTitle('More actions'));
    const menuItems = document.body.querySelectorAll('[role="menuitem"]');
    const printItem = Array.from(menuItems).find((el) => el.textContent?.includes('Print'));
    fireEvent.click(printItem);
    expect(screen.getByTestId('document-view-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('auto-print')).toBeInTheDocument();
  });

  it('closes menu when clicking outside', () => {
    render(
      <ProposalCardServiceStyle proposal={proposal} onSelect={() => {}} onDelete={() => {}} />
    );
    fireEvent.click(screen.getByTitle('More actions'));
    expect(document.body.querySelector('[role="menu"]')).toBeInTheDocument();
    fireEvent.click(document.body);
    expect(document.body.querySelector('[role="menu"]')).not.toBeInTheDocument();
  });

  it('DocumentViewDialog onClose closes dialog', () => {
    render(
      <ProposalCardServiceStyle proposal={proposal} onSelect={() => {}} onDelete={() => {}} />
    );
    fireEvent.click(screen.getByTitle('More actions'));
    fireEvent.click(document.body.querySelector('[role="menuitem"]'));
    expect(screen.getByTestId('document-view-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('document-view-dialog')).not.toBeInTheDocument();
  });

  it('calls onSelect on Enter key on body area', () => {
    const onSelect = jest.fn();
    render(
      <ProposalCardServiceStyle proposal={proposal} onSelect={onSelect} onDelete={() => {}} />
    );
    const clickables = document.querySelectorAll('[role="button"]');
    const body = Array.from(clickables).find((el) => el.classList.contains('p-5') && el.classList.contains('flex-1'));
    expect(body).toBeTruthy();
    fireEvent.keyDown(body, { key: 'Enter', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('prop-1');
  });

  it('renders client name, proposal number, status label, and date when provided', () => {
    render(
      <ProposalCardServiceStyle
        proposal={{
          ...proposal,
          client_id: 'c1',
          proposal_number: 'PROP-001',
          status: 'accepted',
        }}
        onSelect={() => {}}
        onDelete={() => {}}
        clientNameByClientId={{ c1: 'Acme Inc' }}
      />
    );
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByText('PROP-001')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    const timeEl = document.querySelector('time[datetime="2026-02-01"]');
    expect(timeEl).toBeInTheDocument();
  });

  it('renders status label for unknown status as raw value', () => {
    render(
      <ProposalCardServiceStyle
        proposal={{ ...proposal, status: 'custom' }}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText('custom')).toBeInTheDocument();
  });

  it('renders scope_summary when present', () => {
    render(
      <ProposalCardServiceStyle
        proposal={{ ...proposal, scope_summary: 'Build the website and API.' }}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText('Build the website and API.')).toBeInTheDocument();
  });

  it('renders No scope summary when scope_summary is empty', () => {
    render(
      <ProposalCardServiceStyle
        proposal={{ ...proposal, scope_summary: '' }}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText('No scope summary')).toBeInTheDocument();
  });

  it('renders No scope summary when scope_summary is missing', () => {
    render(
      <ProposalCardServiceStyle
        proposal={{ id: 'p2', proposal_title: 'Other', date_created: '2026-01-01' }}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText('No scope summary')).toBeInTheDocument();
  });
});
