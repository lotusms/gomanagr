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
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ nextId: '1' }) });
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
});
