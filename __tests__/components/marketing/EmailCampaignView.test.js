/**
 * Unit tests for EmailCampaignView: mount with mocked provider and mock data.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import EmailCampaignView from '@/components/marketing/EmailCampaignView';

jest.mock('@/lib/marketing/providerRegistry', () => ({
  getActiveProviderForChannel: jest.fn(() => Promise.resolve(null)),
  getProviderCapabilities: jest.fn(() => ({ email: true, sms: false })),
  sendCampaign: jest.fn(),
  sendTestMessage: jest.fn(),
}));
jest.mock('@/lib/marketingMockData', () => ({
  getMockRecipientsByGroup: jest.fn(() => []),
  getMockCampaignsByChannel: jest.fn(() => []),
}));
jest.mock('@/components/ui', () => ({
  PageHeader: ({ title }) => <h1>{title}</h1>,
}));
jest.mock('@/components/marketing/RecipientSelector', () => function MockRecipientSelector() {
  return <div data-testid="recipient-selector">RecipientSelector</div>;
});
jest.mock('@/components/marketing/CampaignHistoryTable', () => function MockCampaignHistoryTable() {
  return <div data-testid="campaign-history-table">CampaignHistoryTable</div>;
});
jest.mock('@/components/marketing/ProviderWarningBanner', () => function MockProviderWarningBanner() {
  return <div data-testid="provider-warning-banner" />;
});
jest.mock('@/components/marketing/ProviderInfoCard', () => function MockProviderInfoCard() {
  return <div data-testid="provider-info-card" />;
});
jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, ...props }) => <button {...props}>{children}</button>,
  SecondaryButton: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

describe('EmailCampaignView', () => {
  it('renders without crashing', () => {
    const { container } = render(<EmailCampaignView showPageHeader={false} />);
    expect(container).toBeInTheDocument();
  });

  it('renders RecipientSelector and CampaignHistoryTable', () => {
    render(<EmailCampaignView showPageHeader={false} />);
    expect(screen.getByTestId('recipient-selector')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-history-table')).toBeInTheDocument();
  });

  it('shows page header when showPageHeader is true', () => {
    render(<EmailCampaignView showPageHeader />);
    expect(screen.getByText('Email Marketing')).toBeInTheDocument();
  });
});
