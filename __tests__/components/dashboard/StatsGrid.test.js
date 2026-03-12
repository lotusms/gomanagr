/**
 * Unit tests for StatsGrid:
 * - Renders 4 stat cards; uses userAccount (clients, teamMembers, invoices)
 * - countTotalProjectsFromClients; apiCounts override; teamMemberCount; industry terms
 * - StatCard title, value, sub, accent
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import StatsGrid from '@/components/dashboard/StatsGrid';

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getProjectTermForIndustry: (industry) => (industry ? `Projects-${industry}` : 'Projects'),
  getTermForIndustry: (industry, key) => (industry ? `${key}-${industry}` : key),
}));

jest.mock('react-icons/hi', () => ({
  HiFolder: () => <span data-testid="icon-folder" aria-hidden />,
  HiUsers: () => <span data-testid="icon-users" aria-hidden />,
  HiCurrencyDollar: () => <span data-testid="icon-dollar" aria-hidden />,
  HiUserGroup: () => <span data-testid="icon-usergroup" aria-hidden />,
}));

describe('StatsGrid', () => {
  it('renders four stat cards with empty userAccount', () => {
    render(<StatsGrid userAccount={{}} />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('client')).toBeInTheDocument();
    expect(screen.getByText('teamMember')).toBeInTheDocument();
    expect(screen.getByText(/invoice/i)).toBeInTheDocument();
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });

  it('renders with null/undefined userAccount', () => {
    render(<StatsGrid />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(4);
  });

  it('uses userAccount.clients length for client count when no apiCounts', () => {
    render(
      <StatsGrid
        userAccount={{
          clients: [{ id: '1' }, { id: '2' }],
          teamMembers: [],
          invoices: [],
        }}
      />
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('uses countTotalProjectsFromClients when apiCounts.projectCount not provided', () => {
    render(
      <StatsGrid
        userAccount={{
          clients: [
            { activeProjects: [{ id: 'a1' }], completedProjects: [{ id: 'c1' }, { id: 'c2' }] },
            { activeProjects: [], completedProjects: [{ id: 'c3' }] },
          ],
          teamMembers: [],
          invoices: [],
        }}
      />
    );
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('uses userAccount.invoices.length when apiCounts.invoiceCount not provided', () => {
    render(
      <StatsGrid
        userAccount={{
          clients: [],
          teamMembers: [],
          invoices: [{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }],
        }}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('uses userAccount.teamMembers.length for team count when teamMemberCount not provided', () => {
    render(
      <StatsGrid
        userAccount={{
          clients: [],
          teamMembers: [{ id: 't1' }, { id: 't2' }],
          invoices: [],
        }}
      />
    );
    const zeros = screen.getAllByText('0');
    const two = screen.getByText('2');
    expect(two).toBeInTheDocument();
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it('uses apiCounts when provided', () => {
    render(
      <StatsGrid
        userAccount={{ clients: [], teamMembers: [], invoices: [] }}
        apiCounts={{ projectCount: 10, clientCount: 5, invoiceCount: 7 }}
      />
    );
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('uses teamMemberCount over userAccount.teamMembers when both provided', () => {
    render(
      <StatsGrid
        userAccount={{
          clients: [],
          teamMembers: [{ id: 't1' }],
          invoices: [],
        }}
        teamMemberCount={12}
      />
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('uses organization.industry for terms when provided', () => {
    render(
      <StatsGrid
        userAccount={{ clients: [], teamMembers: [], invoices: [] }}
        organization={{ industry: 'healthcare' }}
      />
    );
    expect(screen.getByText('Projects-healthcare')).toBeInTheDocument();
    expect(screen.getByText('client-healthcare')).toBeInTheDocument();
    expect(screen.getByText('teamMember-healthcare')).toBeInTheDocument();
  });

  it('uses userAccount.industry when organization not provided', () => {
    render(
      <StatsGrid
        userAccount={{
          industry: 'legal',
          clients: [],
          teamMembers: [],
          invoices: [],
        }}
      />
    );
    expect(screen.getByText('Projects-legal')).toBeInTheDocument();
  });

  it('treats apiCounts as empty when not an object', () => {
    render(
      <StatsGrid
        userAccount={{ clients: [{ id: '1' }], teamMembers: [], invoices: [] }}
        apiCounts={null}
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('countTotalProjectsFromClients returns 0 for non-array clients', () => {
    render(
      <StatsGrid
        userAccount={{
          clients: null,
          teamMembers: [],
          invoices: [],
        }}
      />
    );
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(4);
  });

  it('countTotalProjectsFromClients returns 0 for empty clients', () => {
    render(
      <StatsGrid
        userAccount={{
          clients: [],
          teamMembers: [],
          invoices: [],
        }}
      />
    );
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(4);
  });

  it('handles clients with missing activeProjects/completedProjects', () => {
    render(
      <StatsGrid
        userAccount={{
          clients: [{ id: '1' }, { id: '2', activeProjects: [{}], completedProjects: [] }],
          teamMembers: [],
          invoices: [],
        }}
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders grid with four stat cards in document', () => {
    const { container } = render(
      <StatsGrid userAccount={{ clients: [], teamMembers: [], invoices: [] }} />
    );
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(screen.getAllByTestId('icon-folder').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('icon-usergroup').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('icon-users').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('icon-dollar').length).toBeGreaterThanOrEqual(1);
  });

  it('apiCounts with zero values overrides userAccount for project, client, invoice', () => {
    render(
      <StatsGrid
        userAccount={{
          clients: [{ id: '1' }],
          teamMembers: [{ id: 't1' }],
          invoices: [{ id: 'i1' }],
        }}
        apiCounts={{ projectCount: 0, clientCount: 0, invoiceCount: 0 }}
      />
    );
    expect(screen.getAllByText('0')).toHaveLength(3);
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
