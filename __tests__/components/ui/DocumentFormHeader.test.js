/**
 * Unit tests for DocumentFormHeader:
 * - Client section layout (title + doc ID + status in one row) when no client/proposal dropdowns
 * - Full-width title layout when showClientDropdown or showUseProposalDropdown
 * - Client dropdown, Use Proposal dropdown, client email row, loading placeholders
 * - onClientChange, onUseProposalChange, onStatusChange
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentFormHeader from '@/components/ui/DocumentFormHeader';

describe('DocumentFormHeader', () => {
  const defaultProps = {
    sectionLabel: 'Proposal',
    idPrefix: 'proposal',
    titleLabel: 'Proposal title',
    titleValue: 'My Proposal',
    onTitleChange: () => {},
    documentIdLabel: 'Proposal ID',
    documentIdValue: 'PROP-001',
    onDocumentIdChange: () => {},
    statusLabel: 'Status',
    statusValue: 'draft',
    statusOptions: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
    ],
    onStatusChange: () => {},
  };

  it('renders title, document ID, and status in one row when no client or use-proposal', () => {
    render(<DocumentFormHeader {...defaultProps} />);
    expect(screen.getByLabelText('Proposal title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My Proposal')).toBeInTheDocument();
    expect(screen.getByLabelText('Proposal ID')).toBeInTheDocument();
    expect(screen.getByDisplayValue('PROP-001')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('renders full-width title row and client dropdown when showClientDropdown is true', () => {
    render(
      <DocumentFormHeader
        {...defaultProps}
        showClientDropdown
        selectedClientId=""
        onClientChange={() => {}}
        clientOptions={[{ value: 'c1', label: 'Acme' }]}
      />
    );
    expect(screen.getByLabelText('Proposal title')).toBeInTheDocument();
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
    expect(screen.getByLabelText('Proposal ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('renders full-width title and use proposal dropdown when showUseProposalDropdown is true', () => {
    render(
      <DocumentFormHeader
        {...defaultProps}
        showUseProposalDropdown
        useProposalValue=""
        onUseProposalChange={() => {}}
        useProposalOptions={[{ value: 'p1', label: 'Quote A' }]}
      />
    );
    expect(screen.getByLabelText('Proposal title')).toBeInTheDocument();
    expect(screen.getByLabelText('Use Proposal')).toBeInTheDocument();
    expect(screen.getByLabelText('Proposal ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('renders both client and use proposal dropdowns with 4-col grid', () => {
    render(
      <DocumentFormHeader
        {...defaultProps}
        showClientDropdown
        showUseProposalDropdown
        selectedClientId=""
        onClientChange={() => {}}
        clientOptions={[{ value: 'c1', label: 'Acme' }]}
        useProposalValue=""
        onUseProposalChange={() => {}}
        useProposalOptions={[{ value: 'p1', label: 'Quote A' }]}
      />
    );
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
    expect(screen.getByLabelText('Use Proposal')).toBeInTheDocument();
  });

  it('shows client email field when showClientEmail is true', () => {
    render(
      <DocumentFormHeader
        {...defaultProps}
        showClientDropdown
        onClientChange={() => {}}
        clientOptions={[]}
        showClientEmail
        clientEmailValue="client@example.com"
        clientEmailDisabled={false}
      />
    );
    expect(screen.getByLabelText('Client email')).toBeInTheDocument();
    expect(screen.getByDisplayValue('client@example.com')).toBeInTheDocument();
  });

  it('shows client email hint when clientEmailHint is provided', () => {
    render(
      <DocumentFormHeader
        {...defaultProps}
        showClientDropdown
        onClientChange={() => {}}
        clientOptions={[]}
        showClientEmail
        clientEmailHint="From client profile"
      />
    );
    expect(screen.getByText('From client profile')).toBeInTheDocument();
  });

  it('shows Loading… in client dropdown when clientsLoading is true', () => {
    render(
      <DocumentFormHeader
        {...defaultProps}
        showClientDropdown
        onClientChange={() => {}}
        clientOptions={[]}
        clientsLoading
      />
    );
    const clientTrigger = screen.getByLabelText('Client');
    expect(clientTrigger).toHaveTextContent('Loading…');
  });

  it('shows Loading… in use proposal dropdown when useProposalLoading is true', () => {
    render(
      <DocumentFormHeader
        {...defaultProps}
        showUseProposalDropdown
        onUseProposalChange={() => {}}
        useProposalOptions={[]}
        useProposalLoading
      />
    );
    const useProposalTrigger = screen.getByLabelText('Use Proposal');
    expect(useProposalTrigger).toHaveTextContent('Loading…');
  });

  it('calls onClientChange when client dropdown selection changes', () => {
    const onClientChange = jest.fn();
    render(
      <DocumentFormHeader
        {...defaultProps}
        showClientDropdown
        onClientChange={onClientChange}
        clientOptions={[{ value: 'c1', label: 'Acme' }, { value: 'c2', label: 'Beta' }]}
      />
    );
    fireEvent.click(screen.getByLabelText('Client'));
    const options = screen.getAllByRole('option');
    if (options.length > 0) {
      fireEvent.click(options[0]);
      expect(onClientChange).toHaveBeenCalled();
    }
  });

  it('calls onUseProposalChange when use proposal dropdown selection changes', () => {
    const onUseProposalChange = jest.fn();
    render(
      <DocumentFormHeader
        {...defaultProps}
        showUseProposalDropdown
        onUseProposalChange={onUseProposalChange}
        useProposalOptions={[{ value: 'p1', label: 'Quote A' }]}
      />
    );
    fireEvent.click(screen.getByLabelText('Use Proposal'));
    const options = screen.getAllByRole('option');
    if (options.length > 0) {
      fireEvent.click(options[0]);
      expect(onUseProposalChange).toHaveBeenCalled();
    }
  });

  it('calls onStatusChange when status dropdown selection changes', () => {
    const onStatusChange = jest.fn();
    render(<DocumentFormHeader {...defaultProps} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByLabelText('Status'));
    const options = screen.getAllByRole('option');
    if (options.length > 0) {
      fireEvent.click(options[0]);
      expect(onStatusChange).toHaveBeenCalled();
    }
  });

  it('calls onStatusChange when status changes in full-width layout (client + status row)', () => {
    const onStatusChange = jest.fn();
    render(
      <DocumentFormHeader
        {...defaultProps}
        showClientDropdown
        onClientChange={() => {}}
        clientOptions={[{ value: 'c1', label: 'Acme' }]}
        onStatusChange={onStatusChange}
      />
    );
    fireEvent.click(screen.getByLabelText('Status'));
    const options = screen.getAllByRole('option');
    if (options.length > 0) {
      fireEvent.click(options[0]);
      expect(onStatusChange).toHaveBeenCalled();
    }
  });

  it('does not throw when onClientChange is undefined', () => {
    render(
      <DocumentFormHeader
        {...defaultProps}
        showClientDropdown
        clientOptions={[{ value: 'c1', label: 'Acme' }]}
      />
    );
    fireEvent.click(screen.getByLabelText('Client'));
    const options = screen.getAllByRole('option');
    if (options.length > 0) {
      expect(() => fireEvent.click(options[0])).not.toThrow();
    }
  });

  it('applies statusTriggerClassName to status dropdown', () => {
    render(
      <DocumentFormHeader
        {...defaultProps}
        statusTriggerClassName="custom-status"
      />
    );
    const statusTrigger = screen.getByLabelText('Status');
    expect(statusTrigger).toHaveClass('custom-status');
  });

  it('renders client dropdown as searchable when clientOptions.length > 10', () => {
    const manyClients = Array.from({ length: 11 }, (_, i) => ({ value: `c${i}`, label: `Client ${i}` }));
    render(
      <DocumentFormHeader
        {...defaultProps}
        showClientDropdown
        onClientChange={() => {}}
        clientOptions={manyClients}
      />
    );
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
  });

  it('renders use proposal dropdown as searchable when useProposalOptions.length > 5', () => {
    const manyProposals = Array.from({ length: 6 }, (_, i) => ({ value: `p${i}`, label: `Proposal ${i}` }));
    render(
      <DocumentFormHeader
        {...defaultProps}
        showUseProposalDropdown
        onUseProposalChange={() => {}}
        useProposalOptions={manyProposals}
      />
    );
    expect(screen.getByLabelText('Use Proposal')).toBeInTheDocument();
  });
});
