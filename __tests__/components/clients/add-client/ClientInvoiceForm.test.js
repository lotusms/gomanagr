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

/* eslint-disable no-var -- Jest mock factory runs before `let` bindings exist */
var mockGetUserAccount;
var mockGetOrgServices;
jest.mock('@/services/userService', () => {
  mockGetUserAccount = jest.fn(() => Promise.resolve({ services: [], teamMembers: [] }));
  mockGetOrgServices = jest.fn(() => Promise.resolve({ services: [], teamMembers: [] }));
  return {
    getUserAccount: (...args) => mockGetUserAccount(...args),
    getOrgServices: (...args) => mockGetOrgServices(...args),
    updateOrgServices: jest.fn(() => Promise.resolve()),
    updateServices: jest.fn(() => Promise.resolve()),
  };
});

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
    mockGetUserAccount.mockImplementation(() => Promise.resolve({ services: [], teamMembers: [] }));
    mockGetOrgServices.mockImplementation(() => Promise.resolve({ services: [], teamMembers: [] }));
    global.fetch = mockFetch();
  });

  afterEach(() => {
    if (global.fetch && typeof global.fetch.mockReset === 'function') {
      global.fetch.mockReset();
    }
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
  }, 10000);

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

  it('uses industry-specific labels for Legal account', async () => {
    render(<ClientInvoiceForm {...defaultProps} industry="Legal" />);
    expect(await screen.findByText('Linked case')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use Retainer Agreement/i })).toBeInTheDocument();
  });

  it('loads services via getUserAccount when organizationId is omitted', async () => {
    const props = { clientId: 'c1', userId: 'u1', onSuccess: jest.fn(), onCancel: jest.fn() };
    render(<ClientInvoiceForm {...props} />);
    await waitFor(() => expect(mockGetUserAccount).toHaveBeenCalledWith('u1'));
    expect(mockGetOrgServices).not.toHaveBeenCalled();
  });

  it('sets clients to empty when get-org-clients fetch rejects', async () => {
    global.fetch = jest.fn((url) => {
      if (String(url).includes('get-org-clients')) {
        return Promise.reject(new Error('network'));
      }
      return mockFetch()(url);
    });
    render(<ClientInvoiceForm {...defaultProps} showClientDropdown />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const clientsCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('get-org-clients')
    );
    expect(clientsCall).toBeDefined();
  });

  it('Use Proposal: choosing Fill invoice manually clears scope, terms, and prepopulated attachments', async () => {
    const proposals = [
      {
        id: 'prop-1',
        proposal_number: 'PROP-001',
        proposal_title: 'From proposal',
        scope_summary: 'Scope',
        terms: 'T1',
        line_items: [{ item_name: 'Line', quantity: 1, unit_price: '50', amount: '50' }],
        file_urls: ['https://x/y.pdf'],
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
      return Promise.reject(new Error('Unexpected fetch'));
    });
    render(<ClientInvoiceForm {...defaultProps} />);
    await screen.findByText('Payment method');
    fireEvent.click(screen.getByRole('button', { name: /Use Proposal/i }));
    fireEvent.click(await screen.findByRole('option', { name: /PROP-001/i }));
    await waitFor(() => expect(screen.getByLabelText(/^Scope$/i)).toHaveValue('Scope'));
    fireEvent.click(screen.getByRole('button', { name: /Use Proposal/i }));
    fireEvent.click(await screen.findByRole('option', { name: /Fill invoice manually/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/^Scope$/i)).toHaveValue('');
    });
    fireEvent.click(screen.getByRole('button', { name: /3/ }));
    await waitFor(() => expect(screen.getByLabelText('Terms')).toHaveValue(''));
  });

  it('shows Step 1 Amount when all line items removed and submits amount in payload', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    await screen.findByText('Payment method');
    fireEvent.click(screen.getByRole('button', { name: /2/ }));
    const removeBtn = await screen.findByTitle('Remove item');
    fireEvent.click(removeBtn);
    fireEvent.click(screen.getByRole('button', { name: /1/ }));
    expect(await screen.findByLabelText(/Amount \(USD\)/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Amount \(USD\)/i), '199.00');
    await userEvent.type(screen.getByLabelText(/Invoice title/i), 'Flat fee');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => {
      const createCall = Array.from(global.fetch.mock.calls).find((c) =>
        String(c[0]).includes('create-client-invoice')
      );
      expect(createCall).toBeDefined();
      const body = JSON.parse(createCall[1].body);
      expect(body.amount).toBe('199.00');
    });
  });

  it('Save and Send: with invoiceId calls update then send-invoice-email', async () => {
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
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      if (url?.includes?.('send-invoice-email')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url));
    });
    render(
      <ClientInvoiceForm
        {...defaultProps}
        invoiceId="inv-existing"
        initial={{ invoice_title: 'Existing inv' }}
        clientEmail="pay@example.com"
      />
    );
    await screen.findByText('Payment method');
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Send Invoice/i }));
    });
    await waitFor(() => {
      expect(
        Array.from(global.fetch.mock.calls).some((c) => String(c[0]).includes('update-client-invoice'))
      ).toBe(true);
      const sendCall = Array.from(global.fetch.mock.calls).find((c) =>
        String(c[0]).includes('send-invoice-email')
      );
      expect(sendCall).toBeDefined();
      expect(JSON.parse(sendCall[1].body).invoiceId).toBe('inv-existing');
    });
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('Save and Send: when send-invoice-email throws shows network-style error', async () => {
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
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'inv-new' }) });
      }
      if (url?.includes?.('send-invoice-email')) {
        return Promise.reject(new Error('fetch failed'));
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
    await userEvent.type(screen.getByLabelText(/Invoice title/i), 'T');
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Send Invoice/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/saved, but the email could not be sent.*fetch failed/i)).toBeInTheDocument();
    });
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('uploads PDF on step 3 via upload-client-attachment', async () => {
    const origReader = global.FileReader;
    global.FileReader = jest.fn(function MockFileReader() {
      this.readAsDataURL = jest.fn(() => {
        this.result = 'data:application/pdf;base64,AA==';
        queueMicrotask(() => {
          if (this.onload) this.onload();
        });
      });
    });
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
      if (u?.includes?.('get-next-document-id')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggestedId: 'INV-001' }) });
      }
      if (u?.includes?.('upload-client-attachment')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ url: 'https://cdn.example/1-doc.pdf' }) });
      }
      return Promise.reject(new Error('Unexpected fetch: ' + u));
    });
    const file = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' });
    render(<ClientInvoiceForm {...defaultProps} />);
    await screen.findByText('Payment method');
    fireEvent.click(screen.getByRole('button', { name: /3/ }));
    const uploadInput = await screen.findByLabelText(/Invoice files \(PDF\)/i);
    await userEvent.upload(uploadInput, file);
    await waitFor(() => {
      const up = Array.from(global.fetch.mock.calls).find((c) =>
        String(c[0]).includes('upload-client-attachment')
      );
      expect(up).toBeDefined();
      const body = JSON.parse(up[1].body);
      expect(body.filename).toBe('doc.pdf');
      expect(body.clientId).toBe('c1');
    });
    global.FileReader = origReader;
  });
});
