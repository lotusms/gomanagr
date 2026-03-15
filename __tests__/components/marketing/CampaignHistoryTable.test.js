/**
 * Unit tests for CampaignHistoryTable: empty state vs table, channel columns, formatting.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import CampaignHistoryTable from '@/components/marketing/CampaignHistoryTable';

jest.mock('@/components/ui/Table', () => function MockTable({ columns, data, getRowKey, ariaLabel }) {
  return (
    <table role="table" aria-label={ariaLabel}>
      <thead>
        <tr>
          {columns.map((c) => <th key={c.key}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={getRowKey ? getRowKey(row) : row.id}>
            {columns.map((c) => (
              <td key={c.key}>
                {c.render ? c.render(row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
});
jest.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}));
jest.mock('@/components/ui', () => ({ EmptyState: require('@/components/ui/EmptyState').EmptyState }));
jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDate: (d) => (d ? `Formatted:${d}` : '—'),
}));

describe('CampaignHistoryTable', () => {
  it('renders empty state when campaigns is empty', () => {
    render(<CampaignHistoryTable campaigns={[]} channel="sms" />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No campaigns yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first campaign to see it here.')).toBeInTheDocument();
  });

  it('renders empty state when campaigns is null', () => {
    render(<CampaignHistoryTable campaigns={null} channel="email" />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('uses custom empty title and description when provided', () => {
    render(
      <CampaignHistoryTable
        campaigns={[]}
        channel="sms"
        emptyTitle="No SMS campaigns"
        emptyDescription="Send one to get started."
      />
    );
    expect(screen.getByText('No SMS campaigns')).toBeInTheDocument();
    expect(screen.getByText('Send one to get started.')).toBeInTheDocument();
  });

  it('renders table with campaign data for SMS', () => {
    const campaigns = [
      {
        id: 'c1',
        name: 'Summer promo',
        recipientGroup: 'team',
        audienceSize: 10,
        status: 'sent',
        sentAt: '2024-06-15T12:00:00Z',
      },
    ];
    render(<CampaignHistoryTable campaigns={campaigns} channel="sms" />);
    expect(screen.getByRole('table', { name: 'SMS campaign history' })).toBeInTheDocument();
    expect(screen.getByText('Summer promo')).toBeInTheDocument();
    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('sent')).toBeInTheDocument();
  });

  it('renders Subject column for email channel', () => {
    const campaigns = [
      { id: 'c1', name: 'Newsletter', subject: 'June updates', recipientGroup: 'clients', status: 'draft' },
    ];
    render(<CampaignHistoryTable campaigns={campaigns} channel="email" />);
    expect(screen.getByRole('table', { name: 'Email campaign history' })).toBeInTheDocument();
    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(screen.getByText('June updates')).toBeInTheDocument();
  });
});
