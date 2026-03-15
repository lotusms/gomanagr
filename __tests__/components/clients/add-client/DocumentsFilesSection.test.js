/**
 * Unit tests for DocumentsFilesSection:
 * - Exports DOC_TYPES
 * - Renders intro text and documents nav
 * - With clientId/userId: contracts block (fetch, catch, delete), other blocks empty state
 * - Legacy mode: DocumentBlock, handleAddInHeader, nav count, initialSection
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
});
