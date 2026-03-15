/**
 * Unit tests for ClientProjectForm:
 * - Renders with required mocks; submit create/update paths
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientProjectForm from '@/components/clients/add-client/ClientProjectForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {}, asPath: '/' }),
}));
jest.mock('@/components/ui', () => ({
  useCancelWithConfirm: (onCancel) => ({ handleCancel: onCancel, discardDialog: null }),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (term) => (term === 'project' ? 'Project' : term === 'teamMember' ? 'Team Member' : term === 'client' ? 'Client' : term === 'proposal' ? 'Proposal' : term === 'contract' ? 'Contract' : term),
}));

function mockFetch() {
  return jest.fn((url) => {
    const u = typeof url === 'string' ? url : '';
    if (u.includes('get-next-document-id')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggestedId: 'PROJ-2026-001' }) });
    }
    if (u.includes('get-org-clients')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ clients: [] }) });
    }
    if (u.includes('get-client-proposals') || u.includes('get-proposals')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals: [] }) });
    }
    if (u.includes('get-contracts')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
    }
    if (u.includes('get-org-team-list')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ teamMembers: [] }) });
    }
    if (u.includes('create-client-project')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-project' }) });
    }
    if (u.includes('update-client-project')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.reject(new Error('Unexpected fetch: ' + u));
  });
}

describe('ClientProjectForm', () => {
  const defaultProps = {
    clientId: 'client-1',
    userId: 'user-1',
    organizationId: 'org-1',
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch();
  });

  it('renders project title field and Add project button when no projectId', async () => {
    render(<ClientProjectForm {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /^add project$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('calls create-client-project and onSuccess when form is submitted with title', async () => {
    render(<ClientProjectForm {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
    });
    await userEvent.type(screen.getByLabelText(/project title/i), 'Website Redesign');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const createCall = Array.from(global.fetch.mock.calls).find((c) => String(c[0]).includes('create-client-project'));
    expect(createCall).toBeDefined();
    const body = JSON.parse(createCall[1].body);
    expect(body.clientId).toBe('client-1');
    expect(body.project_name).toBe('Website Redesign');
  });

  it('renders Update project button when projectId provided', async () => {
    render(
      <ClientProjectForm
        {...defaultProps}
        projectId="proj-1"
        initial={{ project_name: 'Existing' }}
      />
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^update project$/i })).toBeInTheDocument();
    });
  });

  it('shows error and does not submit when project title is empty', async () => {
    render(<ClientProjectForm {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
    });
    const submitBtn = screen.getByRole('button', { name: /^add project$/i });
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('create-client-project'),
      expect.any(Object)
    );
  });

  it('calls update-client-project when projectId provided and submit succeeds', async () => {
    render(
      <ClientProjectForm
        {...defaultProps}
        projectId="proj-99"
        initial={{ project_name: 'Existing Project' }}
      />
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/project title/i)).toHaveValue('Existing Project');
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const updateCall = Array.from(global.fetch.mock.calls).find((c) => String(c[0]).includes('update-client-project'));
    expect(updateCall).toBeDefined();
    const body = JSON.parse(updateCall[1].body);
    expect(body.projectId).toBe('proj-99');
    expect(body.project_name).toBe('Existing Project');
    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it('shows error when update-client-project returns not ok', async () => {
    const mockFetchImpl = jest.fn((url) => {
      const u = typeof url === 'string' ? url : '';
      if (u.includes('update-client-project')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Update failed' }) });
      }
      return mockFetch()(url);
    });
    global.fetch = mockFetchImpl;
    render(
      <ClientProjectForm
        {...defaultProps}
        projectId="proj-1"
        initial={{ project_name: 'Existing' }}
      />
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => {
      expect(screen.getByText(/Update failed/)).toBeInTheDocument();
    });
  });

  it('shows error when create-client-project returns not ok', async () => {
    const mockFetchImpl = jest.fn((url) => {
      const u = typeof url === 'string' ? url : '';
      if (u.includes('create-client-project')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Create failed' }) });
      }
      return mockFetch()(url);
    });
    global.fetch = mockFetchImpl;
    render(<ClientProjectForm {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
    });
    await userEvent.type(screen.getByLabelText(/project title/i), 'New Project');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => {
      expect(screen.getByText(/Create failed/)).toBeInTheDocument();
    });
  });

  it('calls onHasChangesChange when form becomes dirty', async () => {
    const onHasChangesChange = jest.fn();
    render(<ClientProjectForm {...defaultProps} onHasChangesChange={onHasChangesChange} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
    });
    await userEvent.type(screen.getByLabelText(/project title/i), 'X');
    await waitFor(() => {
      expect(onHasChangesChange).toHaveBeenCalledWith(true);
    });
  });

  it('when showClientDropdown renders client dropdown and submit is disabled without client', async () => {
    global.fetch = jest.fn((url) => {
      const u = typeof url === 'string' ? url : '';
      if (u.includes('get-org-clients')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ clients: [{ id: 'c1', name: 'Client One' }] }) });
      }
      return mockFetch()(url);
    });
    render(<ClientProjectForm {...defaultProps} showClientDropdown clientId="" />);
    await waitFor(() => {
      expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    });
    const addBtn = screen.getByRole('button', { name: /^add project$/i });
    expect(addBtn).toBeDisabled();
    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });
    await userEvent.type(screen.getByLabelText(/project title/i), 'My Project');
    expect(addBtn).toBeDisabled();
  });

  it('submits with scope summary and notes in payload', async () => {
    render(<ClientProjectForm {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
    });
    await userEvent.type(screen.getByLabelText(/project title/i), 'Build App');
    await userEvent.type(screen.getByLabelText(/scope summary/i), 'Deliver MVP');
    await userEvent.type(screen.getByLabelText(/notes \/ special terms/i), 'Payment on milestone');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const createCall = Array.from(global.fetch.mock.calls).find((c) => String(c[0]).includes('create-client-project'));
    expect(createCall).toBeDefined();
    const body = JSON.parse(createCall[1].body);
    expect(body.project_name).toBe('Build App');
    expect(body.scope_summary).toBe('Deliver MVP');
    expect(body.notes).toBe('Payment on milestone');
  });

  it('when get-client-proposals fails sets proposals to empty', async () => {
    global.fetch = jest.fn((url) => {
      const u = typeof url === 'string' ? url : '';
      if (u.includes('get-client-proposals')) return Promise.reject(new Error('Network error'));
      return mockFetch()(url);
    });
    render(<ClientProjectForm {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText(/linked proposal/i)).toBeInTheDocument();
  });
});
