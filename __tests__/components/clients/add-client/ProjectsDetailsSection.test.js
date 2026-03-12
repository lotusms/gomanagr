/**
 * Unit tests for ProjectsDetailsSection:
 * - Returns null when userId or clientId is missing
 * - Fetches projects, shows loading then empty state or ProjectLogCards
 * - Nav tabs (Draft, Active, On hold, etc.), intro text, Add button when has entries
 * - handleAddInHeader, handleEditProject (router.push), delete confirm flow
 * - Industry terms for labels
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectsDetailsSection from '@/components/clients/add-client/ProjectsDetailsSection';

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'project' ? 'Project' : t === 'client' ? 'Client' : t),
}));

describe('ProjectsDetailsSection', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('returns null when userId is missing', () => {
    const { container } = render(
      <ProjectsDetailsSection clientId="c1" userId={null} organizationId={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when clientId is missing', () => {
    const { container } = render(
      <ProjectsDetailsSection clientId={null} userId="u1" organizationId={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('fetches projects and shows loading then empty state', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-projects'))
        return Promise.resolve({ ok: true, json: async () => ({ projects: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <ProjectsDetailsSection clientId="c1" userId="u1" organizationId={null} />
    );
    await waitFor(() => {
      expect(screen.getByText(/Track .* for this client/)).toBeInTheDocument();
    });
    expect(screen.getByRole('navigation', { name: /project sections/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/No draft project/i)).toBeInTheDocument();
    });
    globalThis.fetch = origFetch;
  });

  it('shows nav tabs (Draft, Active, On hold, etc.)', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-projects'))
        return Promise.resolve({ ok: true, json: async () => ({ projects: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <ProjectsDetailsSection clientId="c1" userId="u1" organizationId={null} />
    );
    await waitFor(() => expect(screen.getByText(/No draft project/i)).toBeInTheDocument());
    expect(screen.getByRole('navigation', { name: /project sections/i })).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('On hold')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Abandoned')).toBeInTheDocument();
    globalThis.fetch = origFetch;
  });

  it('empty state Add button pushes to new project URL with status', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-projects'))
        return Promise.resolve({ ok: true, json: async () => ({ projects: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <ProjectsDetailsSection clientId="c1" userId="u1" organizationId={null} />
    );
    await waitFor(() => expect(screen.getByText(/No draft project/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Add draft project/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/projects/new?status=draft');
    globalThis.fetch = origFetch;
  });

  it('with projects from API shows ProjectLogCards and Add in header pushes to new URL', async () => {
    const projects = [
      { id: 'p1', status: 'active', project_name: 'Website', start_date: '2026-01-01', end_date: null },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-projects'))
        return Promise.resolve({ ok: true, json: async () => ({ projects }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <ProjectsDetailsSection clientId="c1" userId="u1" organizationId={null} />
    );
    await userEvent.click(screen.getByText('Active'));
    await waitFor(() => expect(screen.getByText('Website')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/projects/new?status=active');
    globalThis.fetch = origFetch;
  });

  it('clicking project card pushes to edit URL', async () => {
    const projects = [
      { id: 'p1', status: 'active', project_name: 'Website', start_date: '2026-01-01', end_date: null },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-projects'))
        return Promise.resolve({ ok: true, json: async () => ({ projects }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <ProjectsDetailsSection clientId="c1" userId="u1" organizationId={null} />
    );
    await userEvent.click(screen.getByText('Active'));
    await waitFor(() => expect(screen.getByText('Website')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Website').closest('[role="button"]'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/c1/projects/p1/edit');
    globalThis.fetch = origFetch;
  });

  it('delete confirm removes project from list', async () => {
    const projects = [
      { id: 'p1', status: 'active', project_name: 'To Delete', start_date: '2026-01-01', end_date: null },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-projects'))
        return Promise.resolve({ ok: true, json: async () => ({ projects }) });
      if (url?.includes?.('delete-client-project'))
        return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <ProjectsDetailsSection clientId="c1" userId="u1" organizationId={null} />
    );
    await userEvent.click(screen.getByText('Active'));
    await waitFor(() => expect(screen.getByText('To Delete')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Delete project' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.queryByText('To Delete')).not.toBeInTheDocument());
    expect(screen.getByText(/No active project/i)).toBeInTheDocument();
    globalThis.fetch = origFetch;
  });

  it('delete API failure closes dialog and keeps project', async () => {
    const projects = [
      { id: 'p1', status: 'draft', project_name: 'Keep', start_date: null, end_date: null },
    ];
    const origFetch = globalThis.fetch;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-projects'))
        return Promise.resolve({ ok: true, json: async () => ({ projects }) });
      if (url?.includes?.('delete-client-project'))
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Forbidden' }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <ProjectsDetailsSection clientId="c1" userId="u1" organizationId={null} />
    );
    await waitFor(() => expect(screen.getByText('Keep')).toBeInTheDocument());
    // default tab is draft, so draft project "Keep" is visible
    await userEvent.click(screen.getByRole('button', { name: 'Delete project' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Keep')).toBeInTheDocument();
    globalThis.fetch = origFetch;
    consoleSpy.mockRestore();
  });

  it('fetch reject sets projects to empty', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-projects')) return Promise.reject(new Error('Network error'));
      return Promise.reject(new Error('unknown'));
    });
    render(
      <ProjectsDetailsSection clientId="c1" userId="u1" organizationId={null} />
    );
    await waitFor(() => expect(screen.getByText(/No draft project/i)).toBeInTheDocument());
    globalThis.fetch = origFetch;
  });

  it('switching tab shows filtered projects for that status', async () => {
    const projects = [
      { id: 'p1', status: 'draft', project_name: 'Draft One', start_date: null, end_date: null },
      { id: 'p2', status: 'active', project_name: 'Active One', start_date: '2026-01-01', end_date: null },
    ];
    const origFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url) => {
      if (url?.includes?.('get-projects'))
        return Promise.resolve({ ok: true, json: async () => ({ projects }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <ProjectsDetailsSection clientId="c1" userId="u1" organizationId={null} />
    );
    await waitFor(() => expect(screen.getByText('Draft One')).toBeInTheDocument());
    expect(screen.queryByText('Active One')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Active'));
    await waitFor(() => expect(screen.getByText('Active One')).toBeInTheDocument());
    expect(screen.queryByText('Draft One')).not.toBeInTheDocument();
    globalThis.fetch = origFetch;
  });
});
