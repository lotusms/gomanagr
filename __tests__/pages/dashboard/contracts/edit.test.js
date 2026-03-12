/**
 * Tests for contract edit page: pagination (prev/next), Back link, unsaved-changes dialog flow
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditContractPage from '@/pages/dashboard/contracts/[contractId]/edit';

const mockPush = jest.fn();
let routerQuery = { contractId: 'c2' };
jest.mock('next/router', () => ({
  useRouter: () => ({ query: routerQuery, push: mockPush }),
}));

const mockUser = { uid: 'u1', email: 'u@test.com' };
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser: mockUser }),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: jest.fn(() => Promise.resolve({ id: 'org1', industry: 'general' })),
}));

jest.mock('@/services/userService', () => ({
  getUserAccount: jest.fn(() => Promise.resolve({ clientSettings: { defaultCurrency: 'USD' } })),
}));

let mockFormHasChanges = false;
jest.mock('@/components/clients/add-client/ClientContractForm', () => {
  const React = require('react');
  const ForwardRef = React.forwardRef((props, ref) => {
    React.useEffect(() => {
      props.onHasChangesChange?.(mockFormHasChanges);
    }, [mockFormHasChanges]);
    return (
      <form ref={ref} data-testid="contract-form" onSubmit={(e) => e.preventDefault()}>
        <input data-testid="contract-title" defaultValue="Test Contract" />
        <button type="submit">Save</button>
      </form>
    );
  });
  ForwardRef.displayName = 'ClientContractForm';
  return ForwardRef;
});

describe('EditContractPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routerQuery = { contractId: 'c2' };
    global.fetch = jest.fn((url, opts) => {
      const body = opts?.body ? JSON.parse(opts.body) : {};
      if (url.includes('get-contracts')) {
        if (body.contractId) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                contract: {
                  id: 'c2',
                  client_id: 'client1',
                  contract_title: 'Test Contract',
                  contract_number: 'CONT-002',
                  status: 'draft',
                },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              contracts: [
                { id: 'c1', contract_title: 'First' },
                { id: 'c2', contract_title: 'Second' },
                { id: 'c3', contract_title: 'Third' },
              ],
            }),
        });
      }
      if (url.includes('get-client-attachments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ attachments: [] }) });
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url));
    });
  });

  it('shows loading then edit form with Back to contracts', async () => {
    render(<EditContractPage />);
    await waitFor(() => {
      expect(screen.getByText(/Back to contracts/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId('contract-form')).toBeInTheDocument();
  });

  it('renders Previous and Next icon buttons next to Back', async () => {
    render(<EditContractPage />);
    await waitFor(() => expect(screen.getByTestId('contract-form')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Previous contract/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next contract/i })).toBeInTheDocument();
    expect(screen.getByText(/Back to contracts/i)).toBeInTheDocument();
  });

  it('Previous is enabled and Next is enabled when current is middle of list', async () => {
    render(<EditContractPage />);
    await waitFor(() => expect(screen.getByTestId('contract-form')).toBeInTheDocument());
    const prevBtn = screen.getByRole('button', { name: /Previous contract/i });
    const nextBtn = screen.getByRole('button', { name: /Next contract/i });
    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).not.toBeDisabled();
  });

  it('clicking Next without unsaved changes navigates to next contract edit', async () => {
    render(<EditContractPage />);
    await waitFor(() => expect(screen.getByTestId('contract-form')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Next contract/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/contracts/c3/edit');
  });

  it('clicking Previous without unsaved changes navigates to previous contract edit', async () => {
    render(<EditContractPage />);
    await waitFor(() => expect(screen.getByTestId('contract-form')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Previous contract/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/contracts/c1/edit');
  });

  it('renders UnsavedChangesPaginationDialog in tree (closed by default)', async () => {
    render(<EditContractPage />);
    await waitFor(() => expect(screen.getByTestId('contract-form')).toBeInTheDocument());
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('opens unsaved-changes dialog when Next is clicked and form has changes', async () => {
    mockFormHasChanges = true;
    render(<EditContractPage />);
    await waitFor(() => expect(screen.getByTestId('contract-form')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Next contract/i }));
    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Save and go to next contract/i })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    mockFormHasChanges = false;
  });
});
