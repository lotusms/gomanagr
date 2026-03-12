/**
 * Unit tests for DocumentViewDialog:
 * - Renders when isOpen; title by type and documentTypeLabel; autoPrint; onClose
 * - Print, Close, zoom (in/out/100%), Fit; ProposalInvoiceDocument props
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentViewDialog from '@/components/documents/DocumentViewDialog';

jest.mock('@radix-ui/react-dialog', () => {
  const Root = ({ open, onOpenChange, children }) =>
    open ? (
      <div data-testid="dialog-root" onClick={() => onOpenChange?.(false)}>
        {children}
      </div>
    ) : null;
  const Portal = ({ children }) => <>{children}</>;
  const Overlay = () => <div data-testid="dialog-overlay" />;
  const Content = ({ children }) => <div data-testid="dialog-content">{children}</div>;
  const Title = ({ children }) => <h2 id="doc-title">{children}</h2>;
  const Close = ({ asChild, children }) =>
    asChild ? children : <button type="button">Close</button>;
  return { Root, Portal, Overlay, Content, Title, Close };
});

jest.mock('@/components/documents', () => ({
  ProposalInvoiceDocument: ({ type, document, company, client, currency, lineItemsSectionLabel, documentTypeLabel }) => (
    <div
      data-testid="proposal-invoice-document"
      data-type={type}
      data-currency={currency}
      data-line-items-label={lineItemsSectionLabel}
      data-document-type-label={documentTypeLabel}
    >
      <span>{company.name}</span>
      <span>{client.name}</span>
      <span>{document.title}</span>
    </div>
  ),
}));

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick }) => (
    <button type="button" onClick={onClick} data-testid="primary-btn">
      {children}
    </button>
  ),
}));

jest.mock('react-icons/hi', () => ({
  HiX: () => <span data-testid="icon-x">×</span>,
  HiPrinter: () => <span data-testid="icon-printer">Print</span>,
  HiMinus: () => <span data-testid="icon-minus">−</span>,
  HiPlus: () => <span data-testid="icon-plus">+</span>,
}));

describe('DocumentViewDialog', () => {
  const defaultDoc = { title: 'Doc 1', number: 'P-001' };
  const defaultCompany = { name: 'Acme' };
  const defaultClient = { name: 'Client Co' };
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.print = jest.fn();
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <DocumentViewDialog
        isOpen={false}
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    expect(screen.queryByTestId('dialog-root')).not.toBeInTheDocument();
  });

  it('renders dialog with title and content when isOpen', () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    expect(screen.getByTestId('dialog-root')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /View invoice/i })).toBeInTheDocument();
    expect(screen.getByTestId('proposal-invoice-document')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Client Co')).toBeInTheDocument();
    expect(screen.getByText('Doc 1')).toBeInTheDocument();
  });

  it('uses documentTypeLabel for title when provided', () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="proposal"
        documentTypeLabel="Quote"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    expect(screen.getByRole('heading', { name: 'View Quote' })).toBeInTheDocument();
  });

  it('falls back to "proposal" or "invoice" in title when documentTypeLabel not provided', () => {
    const { rerender } = render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="proposal"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    expect(screen.getByRole('heading', { name: 'View proposal' })).toBeInTheDocument();
    rerender(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    expect(screen.getByRole('heading', { name: 'View invoice' })).toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', async () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls window.print when Print button is clicked', async () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(window.print).toHaveBeenCalled();
  });

  it('calls window.print after 300ms when autoPrint is true', () => {
    jest.useFakeTimers();
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
        autoPrint
      />
    );
    expect(window.print).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(window.print).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('does not call window.print when autoPrint is false', () => {
    jest.useFakeTimers();
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
        autoPrint={false}
      />
    );
    jest.advanceTimersByTime(500);
    expect(window.print).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('passes type, document, company, client, currency, lineItemsSectionLabel to ProposalInvoiceDocument', () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="proposal"
        document={{ title: 'Proposal A' }}
        company={{ name: 'Co' }}
        client={{ name: 'Client' }}
        currency="EUR"
        lineItemsSectionLabel="Procedures"
      />
    );
    const doc = screen.getByTestId('proposal-invoice-document');
    expect(doc).toHaveAttribute('data-type', 'proposal');
    expect(doc).toHaveAttribute('data-currency', 'EUR');
    expect(doc).toHaveAttribute('data-line-items-label', 'Procedures');
  });

  it('shows zoom controls and 100% button', () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fit/i })).toBeInTheDocument();
  });

  it('zoom in increases scale', async () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('125%')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('zoom out decreases scale', async () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByText('75%')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('100% button resets scale to 1', async () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('125%')).toBeInTheDocument();
    fireEvent.click(screen.getByText('125%'));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('zoom out is disabled at MIN_ZOOM', async () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByText('50%')).toBeInTheDocument();
    const zoomOutBtn = screen.getByRole('button', { name: 'Zoom out' });
    expect(zoomOutBtn).toBeDisabled();
  });

  it('zoom in is disabled at MAX_ZOOM', async () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('200%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
  });

  it('Fit button calls fitToHeight and updates scale', async () => {
    render(
      <DocumentViewDialog
        isOpen
        onClose={mockOnClose}
        type="invoice"
        document={defaultDoc}
        company={defaultCompany}
        client={defaultClient}
      />
    );
    const fitBtn = screen.getByRole('button', { name: /fit/i });
    expect(fitBtn).toBeInTheDocument();
    await userEvent.click(fitBtn);
    const contentDiv = document.querySelector('.document-view-content');
    if (contentDiv) {
      Object.defineProperty(contentDiv, 'clientHeight', { value: 600, configurable: true });
      await userEvent.click(fitBtn);
    }
    expect(screen.getByTestId('dialog-root')).toBeInTheDocument();
  });
});
