/**
 * Unit tests for ClientContractForm:
 * - Contract value label and currency
 * - Render with initial values, validation, submit create/update, error, cancel
 * - showClientDropdown and client/proposals/projects/team fetches
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientContractForm from '@/components/clients/add-client/ClientContractForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/', push: jest.fn(), replace: jest.fn(), query: {} }),
}));

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

jest.mock('@/components/ui', () => ({
  useCancelWithConfirm: (onCancel) => ({ handleCancel: onCancel, discardDialog: null }),
}));

function mockFetch() {
  return jest.fn((url, opts) => {
    const u = typeof url === 'string' ? url : (opts?.url || '');
    const body = opts?.body ? (typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body) : {};
    if (u.includes('get-client-proposals')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals: [] }) });
    }
    if (u.includes('get-proposals')) {
      const { proposalId } = body;
      if (proposalId) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              proposal: { line_items: [{ amount: '1000' }], tax: 0, discount: 0 },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals: [] }) });
    }
    if (u.includes('get-org-team-list')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ teamMembers: [] }) });
    }
    if (u.includes('get-org-clients')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ clients: [] }) });
    }
    if (u.includes('get-projects')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [] }) });
    }
    if (u.includes('get-next-document-id')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggestedId: 'CONT-001' }) });
    }
    if (u.includes('create-client-contract')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-contract' }) });
    }
    if (u.includes('update-client-contract')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.reject(new Error('Unexpected fetch: ' + u));
  });
}

describe('ClientContractForm', () => {
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

  it('shows Contract value label with USD when defaultCurrency is USD', async () => {
    render(<ClientContractForm {...defaultProps} defaultCurrency="USD" />);
    expect(await screen.findByText('Contract value (USD)')).toBeInTheDocument();
  });

  it('shows Contract value label with EUR when defaultCurrency is EUR', async () => {
    render(<ClientContractForm {...defaultProps} defaultCurrency="EUR" />);
    expect(await screen.findByText('Contract value (EUR)')).toBeInTheDocument();
  });

  it('shows Contract value label with GBP when defaultCurrency is GBP', async () => {
    render(<ClientContractForm {...defaultProps} defaultCurrency="GBP" />);
    expect(await screen.findByText('Contract value (GBP)')).toBeInTheDocument();
  });

  it('defaults to USD when defaultCurrency is not passed', async () => {
    render(<ClientContractForm {...defaultProps} />);
    expect(await screen.findByText('Contract value (USD)')).toBeInTheDocument();
  });

  it('renders contract value input with id contract-value', async () => {
    render(<ClientContractForm {...defaultProps} defaultCurrency="USD" />);
    const input = await screen.findByLabelText(/Contract value \(USD\)/);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'contract-value');
  });

  it('renders Contract title, Status, Contract type, Start date, End date, Scope summary, Notes', async () => {
    render(<ClientContractForm {...defaultProps} />);
    await screen.findByText(/Contract value \(USD\)/);
    expect(screen.getByLabelText(/Contract title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Status$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contract type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Scope summary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes \/ special terms/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Add contract$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
  });

  it('prefills initial values when initial prop provided', async () => {
    render(
      <ClientContractForm
        {...defaultProps}
        contractId="edit-1"
        initial={{
          contract_title: 'Service Agreement',
          contract_number: 'CON-001',
          status: 'active',
          start_date: '2026-02-01',
          end_date: '2026-12-31',
          scope_summary: 'Scope here',
          notes: 'Notes here',
        }}
      />
    );
    await screen.findByText(/Contract value \(USD\)/);
    expect(screen.getByDisplayValue('Service Agreement')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CON-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Scope here')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Notes here')).toBeInTheDocument();
  });

  it('shows validation error when contract title is empty on submit', async () => {
    render(<ClientContractForm {...defaultProps} />);
    await screen.findByText(/Contract value \(USD\)/);
    fireEvent.submit(document.querySelector('form'));
    expect(screen.getByText(/Contract title is required/i)).toBeInTheDocument();
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('calls create-client-contract and onSuccess when form is submitted with title', async () => {
    render(<ClientContractForm {...defaultProps} />);
    await screen.findByText(/Contract value \(USD\)/);
    await userEvent.type(screen.getByLabelText(/Contract title/i), 'New Agreement');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const createCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('create-client-contract')
    );
    expect(createCall).toBeDefined();
    const body = JSON.parse(createCall[1].body);
    expect(body.clientId).toBe('c1');
    expect(body.contract_title).toBe('New Agreement');
    expect(body.userId).toBe('u1');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('calls update-client-contract with contractId when updating', async () => {
    render(
      <ClientContractForm
        {...defaultProps}
        contractId="contract-99"
        initial={{ contract_title: 'Existing' }}
      />
    );
    await screen.findByText(/Contract value \(USD\)/);
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const updateCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('update-client-contract')
    );
    expect(updateCall).toBeDefined();
    const body = JSON.parse(updateCall[1].body);
    expect(body.contractId).toBe('contract-99');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('shows Update contract button when contractId provided', async () => {
    render(
      <ClientContractForm
        {...defaultProps}
        contractId="contract-1"
        initial={{ contract_title: 'Edit me' }}
      />
    );
    await screen.findByText(/Contract value \(USD\)/);
    expect(screen.getByRole('button', { name: /^Update contract$/i })).toBeInTheDocument();
  });

  it('shows error and does not call onSuccess when create fails', async () => {
    global.fetch = jest.fn((url) => {
      if (url.includes('get-client-proposals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals: [] }) });
      }
      if (url.includes('get-org-team-list')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ teamMembers: [] }) });
      }
      if (url.includes('get-projects')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [] }) });
      }
      if (url.includes('create-client-contract')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Validation failed' }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
    render(<ClientContractForm {...defaultProps} />);
    await screen.findByText(/Contract value \(USD\)/);
    await userEvent.type(screen.getByLabelText(/Contract title/i), 'Title');
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(screen.getByText('Validation failed')).toBeInTheDocument());
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    render(<ClientContractForm {...defaultProps} />);
    await screen.findByText(/Contract value \(USD\)/);
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('fetches get-org-clients when showClientDropdown is true', async () => {
    render(<ClientContractForm {...defaultProps} showClientDropdown />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const clientsCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('get-org-clients')
    );
    expect(clientsCall).toBeDefined();
    expect(screen.getByLabelText(/^Client$/i)).toBeInTheDocument();
  });

  it('fetches get-client-proposals when clientId is set', async () => {
    render(<ClientContractForm {...defaultProps} clientId="c1" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const proposalsCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('get-client-proposals')
    );
    expect(proposalsCall).toBeDefined();
  });

  it('fetches get-projects and get-org-team-list', async () => {
    render(<ClientContractForm {...defaultProps} organizationId="org-1" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(
      Array.from(global.fetch.mock.calls).some((c) => String(c[0]).includes('get-projects'))
    ).toBe(true);
    expect(
      Array.from(global.fetch.mock.calls).some((c) => String(c[0]).includes('get-org-team-list'))
    ).toBe(true);
  });

  it('fetches get-next-document-id when creating (no contractId)', async () => {
    render(<ClientContractForm {...defaultProps} organizationId="org-1" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const nextIdCall = Array.from(global.fetch.mock.calls).find((c) =>
      String(c[0]).includes('get-next-document-id')
    );
    expect(nextIdCall).toBeDefined();
    const body = JSON.parse(nextIdCall[1].body);
    expect(body.prefix).toBe('CONT');
  });

  it('renders with industry prop', async () => {
    render(<ClientContractForm {...defaultProps} industry="legal" />);
    await screen.findByText(/Contract value \(USD\)/);
    expect(screen.getByLabelText(/Contract title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Linked project/i)).toBeInTheDocument();
  });
});
