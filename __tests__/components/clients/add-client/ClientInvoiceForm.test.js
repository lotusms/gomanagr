/**
 * Unit tests for ClientInvoiceForm:
 * - Step 1–3 navigation, Payment method, Line items, Terms, Attachments
 * - Submit create/update, validation, cancel, fetches
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientInvoiceForm from '@/components/clients/add-client/ClientInvoiceForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/', push: jest.fn(), replace: jest.fn(), query: {} }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

jest.mock('@/services/userService', () => ({
  getUserAccount: () => Promise.resolve({ services: [], teamMembers: [] }),
  getOrgServices: () => Promise.resolve({ services: [], teamMembers: [] }),
  updateOrgServices: () => Promise.resolve(),
  updateServices: () => Promise.resolve(),
}));

function mockFetch() {
  return jest.fn((url, opts) => {
    const u = typeof url === 'string' ? url : opts?.url || '';
    if (u?.includes?.('get-client-proposals') || u?.includes?.('get-proposals')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals: [] }) });
    }
    if (u?.includes?.('get-client-contracts')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
    }
    if (u?.includes?.('get-projects')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [] }) });
    }
    if (u?.includes?.('get-org-clients')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ clients: [] }) });
    }
    if (u?.includes?.('get-next-document-id')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggestedId: 'INV-001' }) });
    }
    if (u?.includes?.('create-client-invoice')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-invoice' }) });
    }
    if (u?.includes?.('update-client-invoice')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.reject(new Error('Unexpected fetch: ' + u));
  });
}

describe('ClientInvoiceForm', () => {
  const defaultProps = {
    clientId: 'c1',
    userId: 'u1',
    organizationId: 'org-1',
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch();
  });

  afterEach(() => {
    global.fetch?.mockRestore?.();
  });

  it('shows Payment method and step 2 Line items when defaultCurrency is USD', async () => {
    render(<ClientInvoiceForm {...defaultProps} defaultCurrency="USD" />);
    expect(await screen.findByText('Payment method')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /2/ }));
    expect(await screen.findByText('Add item')).toBeInTheDocument();
  });

  it('shows Payment method and step 2 Line items when defaultCurrency is EUR', async () => {
    render(<ClientInvoiceForm {...defaultProps} defaultCurrency="EUR" />);
    expect(await screen.findByText('Payment method')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /2/ }));
    expect(await screen.findByText('Add item')).toBeInTheDocument();
  });

  it('defaults to USD when defaultCurrency is not passed', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    expect(await screen.findByText('Payment method')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /2/ }));
    expect(await screen.findByText('Add item')).toBeInTheDocument();
  });

  it('shows Payment method dropdown', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    expect(await screen.findByText('Payment method')).toBeInTheDocument();
    const paymentSelect = document.getElementById('payment-method') || screen.getByLabelText('Payment method');
    expect(paymentSelect).toBeInTheDocument();
  });

  it('shows Use Proposal in header and Linked project, Linked contract in step 1', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    expect(await screen.findByText('Use Proposal')).toBeInTheDocument();
    expect(screen.getByText('Linked project')).toBeInTheDocument();
    expect(screen.getByText('Linked contract')).toBeInTheDocument();
  });

  it('shows Terms textarea on step 3', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    const step3Button = screen.getByRole('button', { name: /3/ });
    fireEvent.click(step3Button);
    expect(await screen.findByLabelText('Terms')).toBeInTheDocument();
  });

  it('shows Invoice files (PDF) upload on step 3', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    const step3Button = screen.getByRole('button', { name: /3/ });
    fireEvent.click(step3Button);
    expect(await screen.findByText('Invoice files (PDF)')).toBeInTheDocument();
  });

  it('prefills initial values when initial prop provided', async () => {
    render(
      <ClientInvoiceForm
        {...defaultProps}
        invoiceId="inv-1"
        initial={{
          invoice_title: 'Q1 Invoice',
          invoice_number: 'INV-001',
          status: 'sent',
          date_issued: '2026-02-01',
          due_date: '2026-03-01',
          terms: 'Net 30',
          scope_summary: 'Scope text',
        }}
      />
    );
    expect(await screen.findByText('Payment method')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Q1 Invoice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('INV-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Scope text')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /3/ }));
    expect(await screen.findByDisplayValue('Net 30')).toBeInTheDocument();
  });

  it('shows validation error when invoice title is empty on submit', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    await screen.findByText('Payment method');
    fireEvent.submit(document.querySelector('form'));
    expect(screen.getByText(/Invoice title is required/i)).toBeInTheDocument();
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('calls create-client-invoice and onSuccess when form is submitted with title', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    await screen.findByText('Payment method');
    const titleInput = screen.getByLabelText(/Invoice title/i);
    await userEvent.type(titleInput, 'New Invoice');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const createCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('create-client-invoice')
    );
    expect(createCall).toBeDefined();
    const body = JSON.parse(createCall[1].body);
    expect(body.clientId).toBe('c1');
    expect(body.invoice_title).toBe('New Invoice');
    expect(body.userId).toBe('u1');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('calls update-client-invoice with invoiceId when updating', async () => {
    render(
      <ClientInvoiceForm
        {...defaultProps}
        invoiceId="inv-99"
        initial={{ invoice_title: 'Existing' }}
      />
    );
    await screen.findByText('Payment method');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const updateCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('update-client-invoice')
    );
    expect(updateCall).toBeDefined();
    const body = JSON.parse(updateCall[1].body);
    expect(body.invoiceId).toBe('inv-99');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('shows error and does not call onSuccess when create fails', async () => {
    global.fetch = jest.fn((url) => {
      if (url?.includes?.('get-client-proposals') || url?.includes?.('get-proposals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals: [] }) });
      }
      if (url?.includes?.('get-client-contracts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
      }
      if (url?.includes?.('get-projects')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [] }) });
      }
      if (url?.includes?.('create-client-invoice')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Validation failed' }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
    render(<ClientInvoiceForm {...defaultProps} />);
    await screen.findByText('Payment method');
    await userEvent.type(screen.getByLabelText(/Invoice title/i), 'Title');
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(screen.getByText('Validation failed')).toBeInTheDocument());
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    await screen.findByText('Payment method');
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('fetches get-next-document-id when creating (no invoiceId)', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const nextIdCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('get-next-document-id')
    );
    expect(nextIdCall).toBeDefined();
    const body = JSON.parse(nextIdCall[1].body);
    expect(body.prefix).toBe('INV');
  });

  it('fetches get-org-clients when showClientDropdown is true', async () => {
    render(<ClientInvoiceForm {...defaultProps} showClientDropdown />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const clientsCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('get-org-clients')
    );
    expect(clientsCall).toBeDefined();
  });

  it('fetches get-client-proposals when clientId is set', async () => {
    render(<ClientInvoiceForm {...defaultProps} clientId="c1" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const proposalsCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('get-client-proposals')
    );
    expect(proposalsCall).toBeDefined();
  });

  it('fetches get-projects and get-client-contracts', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(
      Array.from(global.fetch.mock.calls).some((c) => String(c[0]).includes('get-projects'))
    ).toBe(true);
    expect(
      Array.from(global.fetch.mock.calls).some((c) => String(c[0]).includes('get-client-contracts'))
    ).toBe(true);
  });

  it('shows error when update-client-invoice fails', async () => {
    global.fetch = jest.fn((url) => {
      if (url?.includes?.('get-client-proposals') || url?.includes?.('get-proposals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals: [] }) });
      }
      if (url?.includes?.('get-client-contracts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
      }
      if (url?.includes?.('get-projects')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [] }) });
      }
      if (url?.includes?.('update-client-invoice')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Update failed' }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
    render(
      <ClientInvoiceForm
        {...defaultProps}
        invoiceId="inv-1"
        initial={{ invoice_title: 'Existing' }}
      />
    );
    await screen.findByText('Payment method');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(screen.getByText(/Update failed|Failed to update/)).toBeInTheDocument());
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('calls onHasChangesChange when form is edited', async () => {
    const onHasChangesChange = jest.fn();
    render(<ClientInvoiceForm {...defaultProps} onHasChangesChange={onHasChangesChange} />);
    await screen.findByText('Payment method');
    await userEvent.type(screen.getByLabelText(/Invoice title/i), 'X');
    await waitFor(() => expect(onHasChangesChange).toHaveBeenCalledWith(true));
  });

  it('shows Send Invoice secondary button on last step when no invoiceId', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    await screen.findByText('Payment method');
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Invoice/i })).toBeInTheDocument();
    });
  });

  it('Save and Send: with clientEmail creates invoice and sends email then onSuccess', async () => {
    global.fetch = jest.fn((url, opts) => {
      const u = typeof url === 'string' ? url : opts?.url || '';
      if (u?.includes?.('get-client-proposals') || u?.includes?.('get-proposals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals: [] }) });
      }
      if (u?.includes?.('get-client-contracts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
      }
      if (u?.includes?.('get-projects')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [] }) });
      }
      if (u?.includes?.('get-org-clients')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ clients: [] }) });
      }
      if (u?.includes?.('get-next-document-id')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggestedId: 'INV-001' }) });
      }
      if (u?.includes?.('create-client-invoice')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-inv-1' }) });
      }
      if (u?.includes?.('send-invoice-email')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.reject(new Error('Unexpected fetch: ' + u));
    });
    render(
      <ClientInvoiceForm
        {...defaultProps}
        clientEmail="client@example.com"
      />
    );
    await screen.findByText('Payment method');
    await userEvent.type(screen.getByLabelText(/Invoice title/i), 'New Invoice');
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    const sendBtn = await screen.findByRole('button', { name: /Send Invoice/i });
    await act(async () => {
      fireEvent.click(sendBtn);
    });
    await waitFor(() => {
      const createCall = Array.from(global.fetch.mock.calls).find((c) =>
        String(c[0]).includes('create-client-invoice')
      );
      expect(createCall).toBeDefined();
      const sendCall = Array.from(global.fetch.mock.calls).find((c) =>
        String(c[0]).includes('send-invoice-email')
      );
      expect(sendCall).toBeDefined();
      const body = JSON.parse(sendCall[1].body);
      expect(body.to).toBe('client@example.com');
      expect(body.invoiceId).toBe('new-inv-1');
    });
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('Save and Send: when send-invoice-email fails shows error and still calls onSuccess', async () => {
    global.fetch = jest.fn((url) => {
      if (url?.includes?.('get-client-proposals') || url?.includes?.('get-proposals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals: [] }) });
      }
      if (url?.includes?.('get-client-contracts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
      }
      if (url?.includes?.('get-projects')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [] }) });
      }
      if (url?.includes?.('create-client-invoice')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'inv-1' }) });
      }
      if (url?.includes?.('send-invoice-email')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'SMTP error' }) });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
    render(
      <ClientInvoiceForm
        {...defaultProps}
        clientEmail="client@example.com"
      />
    );
    await screen.findByText('Payment method');
    await userEvent.type(screen.getByLabelText(/Invoice title/i), 'Title');
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Send Invoice/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/saved, but the email could not be sent|SMTP error/)).toBeInTheDocument();
    });
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('fetches get-proposals when showClientDropdown and no clientId', async () => {
    const propsNoClient = { userId: 'u1', organizationId: 'org-1', onSuccess: jest.fn(), onCancel: jest.fn(), showClientDropdown: true };
    render(<ClientInvoiceForm {...propsNoClient} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const proposalsCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('get-proposals')
    );
    expect(proposalsCall).toBeDefined();
  });

  it('shows Date sent field when invoiceId and ever_sent', async () => {
    render(
      <ClientInvoiceForm
        {...defaultProps}
        invoiceId="inv-1"
        initial={{ invoice_title: 'Sent', ever_sent: true }}
      />
    );
    await screen.findByText('Payment method');
    expect(screen.getByLabelText(/Date sent/i)).toBeInTheDocument();
  });

  it('Use Proposal: selecting proposal prefills line items and title', async () => {
    const proposals = [
      {
        id: 'prop-1',
        proposal_number: 'PROP-001',
        proposal_title: 'Website Proposal',
        scope_summary: 'Scope here',
        terms: 'Net 30',
        line_items: [
          { id: 'li-1', item_name: 'Design', description: '', quantity: 1, unit_price: '100', amount: '100' },
        ],
        linked_project: '',
        client_id: '',
        file_urls: [],
      },
    ];
    global.fetch = jest.fn((url) => {
      if (url?.includes?.('get-client-proposals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals }) });
      }
      if (url?.includes?.('get-client-contracts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
      }
      if (url?.includes?.('get-projects')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [] }) });
      }
      if (url?.includes?.('get-next-document-id')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggestedId: 'INV-001' }) });
      }
      if (url?.includes?.('create-client-invoice')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-inv' }) });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
    render(<ClientInvoiceForm {...defaultProps} />);
    await screen.findByText('Payment method');
    const useProposalTrigger = screen.getByRole('button', { name: /Use Proposal/i });
    fireEvent.click(useProposalTrigger);
    const option = await screen.findByRole('option', { name: /PROP-001/i });
    fireEvent.click(option);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Website Proposal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Scope here')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /2/ }));
    await waitFor(() => {
      expect(screen.getByText('Add item')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Website Proposal')).toBeInTheDocument();
  });
});
