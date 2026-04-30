/**
 * Unit tests for DocumentsFilesSection:
 * - Exports DOC_TYPES
 * - Renders intro text and documents nav
 * - With clientId/userId: contracts block (fetch, catch, delete), other blocks empty state
 * - Legacy mode: DocumentBlock, handleAddInHeader, nav count, initialSection
 */

import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentsFilesSection, { DOC_TYPES } from '@/components/clients/add-client/DocumentsFilesSection';

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'client' ? 'Client' : t === 'contract' ? 'Contract' : t === 'proposal' ? 'Proposal' : t === 'invoice' ? 'Invoice' : t),
}));

function mockFetchForContractsAndAttachments(overrides = {}) {
  return (url) => {
    if (typeof url === 'string' && url.includes('get-client-contracts')) {
      return Promise.resolve({ ok: true, json: async () => (overrides.contracts ?? { contracts: [] }) });
    }
    if (typeof url === 'string' && url.includes('get-client-attachments')) {
      return Promise.resolve({ ok: true, json: async () => (overrides.attachments ?? { attachments: [] }) });
    }
    return Promise.reject(new Error('unknown url'));
  };
}

describe('DocumentsFilesSection', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('exports DOC_TYPES with expected keys', () => {
    expect(DOC_TYPES.map((t) => t.key)).toEqual([
      'contracts',
      'proposals',
      'invoices',
      'attachments',
      'onlineResources',
    ]);
  });

  it('renders intro text and documents nav when clientId and userId provided', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation(mockFetchForContractsAndAttachments());
    render(
      <DocumentsFilesSection
        clientId="client-1"
        userId="user-1"
        organizationId={null}
      />
    );
    expect(screen.getByText(/Track .* for this client/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Documents sections' })).toBeInTheDocument();
    expect(screen.getAllByText('contract').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Attachments')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/No contract yet|Loading contract/)).toBeInTheDocument();
    });
    globalThis.fetch = origFetch;
  });

  it('ContractsBlock: fetch reject sets contracts to empty', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.reject(new Error('Network error'));
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />
    );
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('ContractsBlock: get-client-attachments reject sets attachments to empty', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.reject(new Error('Network error'));
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('ContractsBlock: delete API failure closes dialog and keeps list', async () => {
    const contracts = [{ id: 'co1', contract_title: 'Keep', contract_number: 'C1', status: 'draft', start_date: '2026-01-01' }];
    const origFetch = globalThis.fetch;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('delete-client-contract')) return Promise.resolve({ ok: false, json: async () => ({ error: 'Forbidden' }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText('Keep')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Delete contract/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Keep')).toBeInTheDocument();
    globalThis.fetch = origFetch;
    consoleSpy.mockRestore();
  });

  it('ContractsBlock: with contracts from API, delete confirm removes item', async () => {
    const contracts = [{ id: 'co1', contract_title: 'Test Contract', contract_number: 'C1', status: 'draft', start_date: '2026-01-01' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts'))
        return Promise.resolve({ ok: true, json: async () => ({ contracts }) });
      if (url?.includes?.('get-client-attachments'))
        return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('delete-client-contract'))
        return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText('Test Contract')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Delete contract/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('initialSection is respected and updates selected viewer', () => {
    const { rerender } = render(
      <DocumentsFilesSection
        initialSection="contracts"
        contracts={[]}
        proposals={[]}
        invoices={[]}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={() => {}}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    expect(screen.getByText('No entries yet')).toBeInTheDocument();
    rerender(
      <DocumentsFilesSection
        initialSection="onlineResources"
        contracts={[]}
        proposals={[]}
        invoices={[]}
        attachments={[]}
        onlineResources={['https://link1.com']}
        onContractsChange={() => {}}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('https://link1.com')).toBeInTheDocument();
  });

  it('legacy mode: DocumentBlock shows contract entry and Add calls onContractsChange', async () => {
    const onContractsChange = jest.fn();
    render(
      <DocumentsFilesSection
        contracts={['Contract One']}
        proposals={[]}
        invoices={[]}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={onContractsChange}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('Contract One')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(onContractsChange).toHaveBeenCalledWith(['Contract One', '']);
  });

  it('legacy mode: DocumentBlock onEdit and onRemove are called', async () => {
    const onContractsChange = jest.fn();
    render(
      <DocumentsFilesSection
        contracts={['Entry A']}
        proposals={[]}
        invoices={[]}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={onContractsChange}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    const input = screen.getByDisplayValue('Entry A');
    await userEvent.type(input, 'x');
    expect(onContractsChange).toHaveBeenCalledWith(['Entry Ax']);
    await userEvent.click(screen.getByRole('button', { name: /Remove entry/i }));
    expect(onContractsChange).toHaveBeenCalledWith([]);
  });

  it('legacy mode: Add in header calls selectedBlock.onAdd when section has entries', async () => {
    const onContractsChange = jest.fn();
    render(
      <DocumentsFilesSection
        contracts={['Existing']}
        proposals={[]}
        invoices={[]}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={onContractsChange}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(onContractsChange).toHaveBeenCalledWith(['Existing', '']);
  });

  it('legacy mode: proposals tab shows DocumentBlock with proposal entry', async () => {
    render(
      <DocumentsFilesSection
        contracts={[]}
        proposals={['Proposal A']}
        invoices={[]}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={() => {}}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('proposal'));
    expect(screen.getByDisplayValue('Proposal A')).toBeInTheDocument();
  });

  it('legacy mode: invoices tab shows DocumentBlock with invoice entry', async () => {
    render(
      <DocumentsFilesSection
        contracts={[]}
        proposals={[]}
        invoices={['INV-001']}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={() => {}}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('invoice'));
    expect(screen.getByDisplayValue('INV-001')).toBeInTheDocument();
  });

  it('legacy mode: nav shows count for section with items', () => {
    render(
      <DocumentsFilesSection
        contracts={[]}
        proposals={['a', 'b']}
        invoices={[]}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={() => {}}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    const nav = screen.getByRole('navigation', { name: 'Documents sections' });
    const proposalBtn = within(nav).getByText('proposal').closest('button');
    expect(proposalBtn).toHaveTextContent('2');
  });

  it('with clientId and API: Add button in header pushes to contracts new', async () => {
    const contracts = [{ id: 'c1', contract_title: 'X', contract_number: '1', status: 'draft', start_date: '2026-01-01' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts'))
        return Promise.resolve({ ok: true, json: async () => ({ contracts }) });
      if (url?.includes?.('get-client-attachments'))
        return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/contracts/new');
    globalThis.fetch = origFetch;
  });

  it('ProposalsBlock with clientId fetches and shows empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-proposals')) return Promise.resolve({ ok: true, json: async () => ({ proposals: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('proposal'));
    await waitFor(() => expect(screen.getByText(/No proposal yet|Loading proposal/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/No proposal yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('InvoicesBlock with clientId fetches and shows empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-invoices')) return Promise.resolve({ ok: true, json: async () => ({ invoices: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('invoice'));
    await waitFor(() => expect(screen.getByText(/No invoice yet|Loading invoice/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/No invoice yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('AttachmentsBlock with clientId fetches and shows empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Attachments'));
    await waitFor(() => expect(screen.getByText(/No attachments yet|Loading attachments/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/No attachments yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('OnlineResourcesBlock with clientId fetches and shows empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-online-resources')) return Promise.resolve({ ok: true, json: async () => ({ resources: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Online Resources'));
    await waitFor(() => expect(screen.getByText(/No online resources yet|Loading online resources/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/No online resources yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('AttachmentsBlock with attachments from API shows cards and Add attachment in empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [{ id: 'att1', name: 'Doc.pdf', file_name: 'Doc.pdf' }] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Attachments'));
    await waitFor(() => expect(screen.getByText(/No attachments yet|Loading attachments|Doc\.pdf/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Doc.pdf')).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('AttachmentsBlock delete confirm removes attachment on API success', async () => {
    const attachments = [{ id: 'att1', name: 'Doc.pdf', file_name: 'Doc.pdf' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments }) });
      if (url?.includes?.('delete-client-attachment')) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Attachments'));
    await waitFor(() => expect(screen.getByText('Doc.pdf')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Delete attachment/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.getByText(/No attachments yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('OnlineResourcesBlock with resources from API shows cards and Add resource in empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-online-resources')) return Promise.resolve({ ok: true, json: async () => ({ resources: [{ id: 'r1', url: 'https://link.com', label: 'Portal' }] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Online Resources'));
    await waitFor(() => expect(screen.getByText(/No online resources yet|Loading online resources|Portal|https:\/\/link\.com/)).toBeInTheDocument());
    await waitFor(() => {
      expect(screen.getByText('https://link.com') || screen.getByText('Portal')).toBeInTheDocument();
    });
    globalThis.fetch = origFetch;
  });

  it('OnlineResourcesBlock Add resource button navigates to new', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-online-resources')) return Promise.resolve({ ok: true, json: async () => ({ resources: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Online Resources'));
    await waitFor(() => expect(screen.getByText(/No online resources yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Add resource/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/online-resources/new');
    globalThis.fetch = origFetch;
  });

  it('OnlineResourcesBlock delete confirm removes resource on API success', async () => {
    const resources = [{ id: 'r1', url: 'https://link.com', label: 'Portal' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-online-resources')) return Promise.resolve({ ok: true, json: async () => ({ resources }) });
      if (url?.includes?.('delete-client-online-resource')) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Online Resources'));
    await waitFor(() => {
      expect(screen.getByText(/https:\/\/link\.com|Portal/)).toBeInTheDocument();
    });
    const deleteBtn = screen.getByRole('button', { name: /Delete resource/i });
    await userEvent.click(deleteBtn);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.getByText(/No online resources yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('handleAddInHeader pushes to proposals new when on proposals tab with clientId', async () => {
    const proposals = [{ id: 'p1', proposal_title: 'Quote 1' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-proposals')) return Promise.resolve({ ok: true, json: async () => ({ proposals }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('proposal'));
    await waitFor(() => expect(screen.getByText('Quote 1')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/proposals/new');
    globalThis.fetch = origFetch;
  });

  it('handleAddInHeader pushes to invoices new when on invoices tab with clientId', async () => {
    const invoices = [{ id: 'inv1', invoice_number: 'INV-1', total: '100' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-invoices')) return Promise.resolve({ ok: true, json: async () => ({ invoices }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('invoice'));
    await waitFor(() => expect(screen.getByText('INV-1')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/invoices/new');
    globalThis.fetch = origFetch;
  });

  it('handleAddInHeader pushes to attachments new when on attachments tab with clientId', async () => {
    const attachments = [{ id: 'a1', name: 'File.pdf', file_name: 'File.pdf' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Attachments'));
    await waitFor(() => expect(screen.getByText('File.pdf')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/attachments/new');
    globalThis.fetch = origFetch;
  });

  it('handleAddInHeader pushes to online-resources new when on Online Resources tab with clientId', async () => {
    const resources = [{ id: 'r1', url: 'https://x.com', label: 'X' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-online-resources')) return Promise.resolve({ ok: true, json: async () => ({ resources }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Online Resources'));
    await waitFor(() => {
      expect(screen.getByText(/https:\/\/x\.com|X/)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/online-resources/new');
    globalThis.fetch = origFetch;
  });

  it('legacy mode: Add in header calls selectedBlock.onAdd for proposals tab', async () => {
    const onProposalsChange = jest.fn();
    render(
      <DocumentsFilesSection
        contracts={[]}
        proposals={['Proposal One']}
        invoices={[]}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={() => {}}
        onProposalsChange={onProposalsChange}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('proposal'));
    expect(screen.getByDisplayValue('Proposal One')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(onProposalsChange).toHaveBeenCalledWith(['Proposal One', '']);
  });

  it('legacy mode: Add in header calls selectedBlock.onAdd for invoices tab', async () => {
    const onInvoicesChange = jest.fn();
    render(
      <DocumentsFilesSection
        contracts={[]}
        proposals={[]}
        invoices={['INV-1']}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={() => {}}
        onProposalsChange={() => {}}
        onInvoicesChange={onInvoicesChange}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('invoice'));
    expect(screen.getByDisplayValue('INV-1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(onInvoicesChange).toHaveBeenCalledWith(['INV-1', '']);
  });

  it('legacy mode: Add in header calls selectedBlock.onAdd for attachments tab', async () => {
    const onAttachmentsChange = jest.fn();
    render(
      <DocumentsFilesSection
        contracts={[]}
        proposals={[]}
        invoices={[]}
        attachments={['att1.txt']}
        onlineResources={[]}
        onContractsChange={() => {}}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={onAttachmentsChange}
        onOnlineResourcesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('Attachments'));
    expect(screen.getByDisplayValue('att1.txt')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(onAttachmentsChange).toHaveBeenCalledWith(['att1.txt', '']);
  });

  it('legacy mode: Add in header calls selectedBlock.onAdd for onlineResources tab', async () => {
    const onOnlineResourcesChange = jest.fn();
    render(
      <DocumentsFilesSection
        contracts={[]}
        proposals={[]}
        invoices={[]}
        attachments={[]}
        onlineResources={['https://site.com']}
        onContractsChange={() => {}}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={onOnlineResourcesChange}
      />
    );
    await userEvent.click(screen.getByText('Online Resources'));
    expect(screen.getByDisplayValue('https://site.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(onOnlineResourcesChange).toHaveBeenCalledWith(['https://site.com', '']);
  });

  it('legacy mode: proposals tab onEdit and onRemove call onProposalsChange', async () => {
    const onProposalsChange = jest.fn();
    render(
      <DocumentsFilesSection
        contracts={[]}
        proposals={['Alpha']}
        invoices={[]}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={() => {}}
        onProposalsChange={onProposalsChange}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('proposal'));
    await userEvent.type(screen.getByDisplayValue('Alpha'), '!');
    expect(onProposalsChange).toHaveBeenCalledWith(['Alpha!']);
    await userEvent.click(screen.getByRole('button', { name: /Remove entry/i }));
    expect(onProposalsChange).toHaveBeenCalledWith([]);
  });

  it('legacy mode: invoices tab onEdit and onRemove call onInvoicesChange', async () => {
    const onInvoicesChange = jest.fn();
    render(
      <DocumentsFilesSection
        contracts={[]}
        proposals={[]}
        invoices={['INV-A']}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={() => {}}
        onProposalsChange={() => {}}
        onInvoicesChange={onInvoicesChange}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('invoice'));
    await userEvent.type(screen.getByDisplayValue('INV-A'), 'x');
    expect(onInvoicesChange).toHaveBeenCalledWith(['INV-Ax']);
    await userEvent.click(screen.getByRole('button', { name: /Remove entry/i }));
    expect(onInvoicesChange).toHaveBeenCalledWith([]);
  });

  it('legacy mode: attachments tab onEdit and onRemove call onAttachmentsChange', async () => {
    const onAttachmentsChange = jest.fn();
    render(
      <DocumentsFilesSection
        contracts={[]}
        proposals={[]}
        invoices={[]}
        attachments={['file.txt']}
        onlineResources={[]}
        onContractsChange={() => {}}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={onAttachmentsChange}
        onOnlineResourcesChange={() => {}}
      />
    );
    await userEvent.click(screen.getByText('Attachments'));
    const attInput = screen.getByDisplayValue('file.txt');
    fireEvent.change(attInput, { target: { value: 'file-renamed.txt' } });
    expect(onAttachmentsChange).toHaveBeenLastCalledWith(['file-renamed.txt']);
    await userEvent.click(screen.getByRole('button', { name: /Remove entry/i }));
    expect(onAttachmentsChange).toHaveBeenCalledWith([]);
  });

  it('legacy mode: onlineResources tab onEdit and onRemove call onOnlineResourcesChange', async () => {
    const onOnlineResourcesChange = jest.fn();
    render(
      <DocumentsFilesSection
        contracts={[]}
        proposals={[]}
        invoices={[]}
        attachments={[]}
        onlineResources={['https://a.com']}
        onContractsChange={() => {}}
        onProposalsChange={() => {}}
        onInvoicesChange={() => {}}
        onAttachmentsChange={() => {}}
        onOnlineResourcesChange={onOnlineResourcesChange}
      />
    );
    await userEvent.click(screen.getByText('Online Resources'));
    const urlInput = screen.getByDisplayValue('https://a.com');
    fireEvent.change(urlInput, { target: { value: 'https://a.com/portal' } });
    expect(onOnlineResourcesChange).toHaveBeenLastCalledWith(['https://a.com/portal']);
    await userEvent.click(screen.getByRole('button', { name: /Remove entry/i }));
    expect(onOnlineResourcesChange).toHaveBeenCalledWith([]);
  });

  it('updates selected section when initialSection changes (legacy)', () => {
    const noop = () => {};
    const { rerender } = render(
      <DocumentsFilesSection
        initialSection="contracts"
        contracts={[]}
        proposals={['Only']}
        invoices={[]}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={noop}
        onProposalsChange={noop}
        onInvoicesChange={noop}
        onAttachmentsChange={noop}
        onOnlineResourcesChange={noop}
      />
    );
    expect(screen.getByText('No entries yet')).toBeInTheDocument();
    rerender(
      <DocumentsFilesSection
        initialSection="proposals"
        contracts={[]}
        proposals={['Only']}
        invoices={[]}
        attachments={[]}
        onlineResources={[]}
        onContractsChange={noop}
        onProposalsChange={noop}
        onInvoicesChange={noop}
        onAttachmentsChange={noop}
        onOnlineResourcesChange={noop}
      />
    );
    expect(screen.getByDisplayValue('Only')).toBeInTheDocument();
  });

  it('ProposalsBlock: get-client-proposals reject shows empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-proposals')) return Promise.reject(new Error('fail'));
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('proposal'));
    await waitFor(() => expect(screen.getByText(/No proposal yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('ProposalsBlock: delete confirm removes proposal on API success', async () => {
    const proposals = [{ id: 'p1', proposal_title: 'P Title', proposal_number: 'PR-1', status: 'draft' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-proposals')) return Promise.resolve({ ok: true, json: async () => ({ proposals }) });
      if (url?.includes?.('delete-client-proposal')) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('proposal'));
    await waitFor(() => expect(screen.getByText('P Title')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Delete proposal/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.getByText(/No proposal yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('ProposalsBlock: delete API failure closes dialog and keeps list', async () => {
    const proposals = [{ id: 'p1', proposal_title: 'Keep', proposal_number: 'PR-1', status: 'draft' }];
    const origFetch = globalThis.fetch;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-proposals')) return Promise.resolve({ ok: true, json: async () => ({ proposals }) });
      if (url?.includes?.('delete-client-proposal')) return Promise.resolve({ ok: false, json: async () => ({ error: 'nope' }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('proposal'));
    await waitFor(() => expect(screen.getByText('Keep')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Delete proposal/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Keep')).toBeInTheDocument();
    globalThis.fetch = origFetch;
    consoleSpy.mockRestore();
  });

  it('ProposalsBlock: Add proposal navigates to new URL when list empty', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-proposals')) return Promise.resolve({ ok: true, json: async () => ({ proposals: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('proposal'));
    await waitFor(() => expect(screen.getByText(/No proposal yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Add proposal/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/proposals/new');
    globalThis.fetch = origFetch;
  });

  it('InvoicesBlock: get-client-invoices reject shows empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-invoices')) return Promise.reject(new Error('fail'));
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('invoice'));
    await waitFor(() => expect(screen.getByText(/No invoice yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('InvoicesBlock: paid invoice card navigates to receipts', async () => {
    const invoices = [{ id: 'inv-paid', invoice_number: 'I-1', invoice_title: 'Done', status: 'paid', total: '10' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-invoices')) return Promise.resolve({ ok: true, json: async () => ({ invoices }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('invoice'));
    await waitFor(() => expect(screen.getByText('Done')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Done').closest('[role="button"]'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/receipts?open=inv-paid');
    globalThis.fetch = origFetch;
  });

  it('InvoicesBlock: partially_paid navigates to receipts', async () => {
    const invoices = [{ id: 'inv-p', invoice_number: 'I-2', invoice_title: 'Part', status: 'partially_paid', total: '5' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-invoices')) return Promise.resolve({ ok: true, json: async () => ({ invoices }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('invoice'));
    await waitFor(() => expect(screen.getByText('Part')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Part').closest('[role="button"]'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/receipts?open=inv-p');
    globalThis.fetch = origFetch;
  });

  it('InvoicesBlock: draft invoice card navigates to edit', async () => {
    const invoices = [{ id: 'inv-d', invoice_number: 'I-3', invoice_title: 'Draft inv', status: 'draft', total: '1' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-invoices')) return Promise.resolve({ ok: true, json: async () => ({ invoices }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('invoice'));
    await waitFor(() => expect(screen.getByText('Draft inv')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Draft inv').closest('[role="button"]'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/invoices/inv-d/edit');
    globalThis.fetch = origFetch;
  });

  it('InvoicesBlock: delete confirm removes invoice on API success', async () => {
    const invoices = [{ id: 'ix', invoice_number: 'N1', invoice_title: 'T1', status: 'draft' }];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-invoices')) return Promise.resolve({ ok: true, json: async () => ({ invoices }) });
      if (url?.includes?.('delete-client-invoice')) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('invoice'));
    await waitFor(() => expect(screen.getByText('T1')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Delete invoice/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.getByText(/No invoice yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('InvoicesBlock: delete API failure closes dialog', async () => {
    const invoices = [{ id: 'ix', invoice_number: 'N1', invoice_title: 'Keep inv', status: 'draft' }];
    const origFetch = globalThis.fetch;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-invoices')) return Promise.resolve({ ok: true, json: async () => ({ invoices }) });
      if (url?.includes?.('delete-client-invoice')) return Promise.resolve({ ok: false, json: async () => ({ error: 'bad' }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('invoice'));
    await waitFor(() => expect(screen.getByText('Keep inv')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Delete invoice/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Keep inv')).toBeInTheDocument();
    globalThis.fetch = origFetch;
    consoleSpy.mockRestore();
  });

  it('InvoicesBlock: Add invoice navigates when list empty', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-invoices')) return Promise.resolve({ ok: true, json: async () => ({ invoices: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('invoice'));
    await waitFor(() => expect(screen.getByText(/No invoice yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Add invoice/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/invoices/new');
    globalThis.fetch = origFetch;
  });

  it('AttachmentsBlock: get-client-attachments reject shows empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.reject(new Error('net'));
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Attachments'));
    await waitFor(() => expect(screen.getByText(/No attachments yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('AttachmentsBlock: delete API failure closes dialog', async () => {
    const attachments = [{ id: 'a1', name: 'Keep.pdf', file_name: 'Keep.pdf' }];
    const origFetch = globalThis.fetch;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments }) });
      if (url?.includes?.('delete-client-attachment')) return Promise.resolve({ ok: false, json: async () => ({ error: 'x' }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Attachments'));
    await waitFor(() => expect(screen.getByText('Keep.pdf')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Delete attachment/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Keep.pdf')).toBeInTheDocument();
    globalThis.fetch = origFetch;
    consoleSpy.mockRestore();
  });

  it('OnlineResourcesBlock: get-client-online-resources reject shows empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-online-resources')) return Promise.reject(new Error('fail'));
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Online Resources'));
    await waitFor(() => expect(screen.getByText(/No online resources yet/)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('OnlineResourcesBlock: delete API failure closes dialog', async () => {
    const resources = [{ id: 'r1', url: 'https://keep.com', label: 'K' }];
    const origFetch = globalThis.fetch;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-client-contracts')) return Promise.resolve({ ok: true, json: async () => ({ contracts: [] }) });
      if (url?.includes?.('get-client-attachments')) return Promise.resolve({ ok: true, json: async () => ({ attachments: [] }) });
      if (url?.includes?.('get-client-online-resources')) return Promise.resolve({ ok: true, json: async () => ({ resources }) });
      if (url?.includes?.('delete-client-online-resource')) return Promise.resolve({ ok: false, json: async () => ({ error: 'no' }) });
      return Promise.reject(new Error('unknown'));
    });
    render(<DocumentsFilesSection clientId="c1" userId="u1" organizationId={null} />);
    await waitFor(() => expect(screen.getByText(/No contract yet/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('Online Resources'));
    await waitFor(() => expect(screen.getByText(/https:\/\/keep\.com|K/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Delete resource/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/https:\/\/keep\.com|K/)).toBeInTheDocument();
    globalThis.fetch = origFetch;
    consoleSpy.mockRestore();
  });
});
