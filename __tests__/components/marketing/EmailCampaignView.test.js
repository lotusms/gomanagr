/**
 * Unit tests for EmailCampaignView: mount with mocked provider and mock data.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmailCampaignView from '@/components/marketing/EmailCampaignView';
import * as providerRegistry from '@/lib/marketing/providerRegistry';
import * as marketingMockData from '@/lib/marketingMockData';

jest.mock('@/lib/marketing/providerRegistry');
jest.mock('@/lib/marketingMockData');
jest.mock('@/components/ui', () => ({
  PageHeader: ({ title, description, actions }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {actions}
    </div>
  ),
}));
jest.mock('@/components/marketing/RecipientSelector', () => function MockRecipientSelector({
  recipientGroup, onRecipientGroupChange, audienceMode, onAudienceModeChange, selectedIds, onSelectedIdsChange,
}) {
  return (
    <div data-testid="recipient-selector">
      <button type="button" onClick={() => onRecipientGroupChange('team')}>Set Team</button>
      <button type="button" onClick={() => onAudienceModeChange('selected')}>Set Selected</button>
      <button type="button" onClick={() => onSelectedIdsChange(['r1'])}>Select r1</button>
      <span data-testid="audience-mode">{audienceMode}</span>
      <span data-testid="selected-count">{selectedIds.length}</span>
    </div>
  );
});
jest.mock('@/components/marketing/CampaignHistoryTable', () => function MockCampaignHistoryTable({ campaigns }) {
  return (
    <div data-testid="campaign-history-table">
      <span data-testid="campaign-count">{campaigns.length}</span>
      {campaigns[0] && <span data-testid="first-campaign-name">{campaigns[0].name}</span>}
      {campaigns[0]?.status && <span data-testid="first-campaign-status">{campaigns[0].status}</span>}
    </div>
  );
});
jest.mock('@/components/marketing/ProviderWarningBanner', () => function MockProviderWarningBanner({ title }) {
  return <div data-testid="provider-warning-banner">{title}</div>;
});
jest.mock('@/components/marketing/ProviderInfoCard', () => function MockProviderInfoCard({ status, warning }) {
  return (
    <div data-testid="provider-info-card">
      {status ?? 'no-status'}
      {warning && <span data-testid="provider-warning">{warning}</span>}
    </div>
  );
});
jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, ...props }) => <button {...props}>{children}</button>,
  SecondaryButton: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

const mockRecipients = [
  { id: 'r1', name: 'Alice', email: 'alice@test.com', phone: '+15551111111' },
  { id: 'r2', name: 'Bob', email: 'bob@test.com' },
];

function setupMocks(overrides = {}) {
  providerRegistry.getActiveProviderForChannel.mockImplementation(() =>
    Promise.resolve(overrides.provider ?? null)
  );
  providerRegistry.getProviderCapabilities.mockImplementation(() =>
    overrides.capabilities ?? { email: true, sms: false }
  );
  providerRegistry.sendCampaign.mockImplementation(() =>
    Promise.resolve(overrides.sendResult ?? { success: true })
  );
  providerRegistry.sendTestMessage.mockImplementation(() =>
    Promise.resolve(overrides.testMessageResult ?? { success: true })
  );
  marketingMockData.getMockRecipientsByGroup.mockImplementation(() =>
    overrides.recipients ?? []
  );
  marketingMockData.getMockCampaignsByChannel.mockImplementation(() =>
    overrides.campaigns ?? []
  );
}

describe('EmailCampaignView', () => {
  beforeEach(() => {
    setupMocks();
  });

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

  it('shows ProviderWarningBanner when no provider', async () => {
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-warning-banner')).toHaveTextContent('No email provider configured');
    });
  });

  it('shows ProviderInfoCard and fetches status when provider is set', async () => {
    const getProviderStatus = jest.fn().mockResolvedValue({ status: 'connected' });
    setupMocks({
      provider: {
        provider: { providerType: 'resend', senderEmail: 'noreply@example.com' },
        adapter: { getProviderStatus },
      },
    });
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toHaveTextContent('connected');
    });
  });

  it('shows Compose form and recipient summary', () => {
    setupMocks({ recipients: mockRecipients });
    render(<EmailCampaignView showPageHeader={false} />);
    expect(screen.getByText('Compose')).toBeInTheDocument();
    expect(screen.getByLabelText(/Campaign name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject line/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Write your email content/i)).toBeInTheDocument();
    expect(screen.getByText('Recipient summary')).toBeInTheDocument();
    expect(screen.getByText('Audience size')).toBeInTheDocument();
  });

  it('shows empty recipient copy when no recipients', () => {
    setupMocks({ recipients: [] });
    render(<EmailCampaignView showPageHeader={false} />);
    expect(screen.getByText('Select recipients to see summary.')).toBeInTheDocument();
  });

  it('shows recipient summary when recipients exist', () => {
    setupMocks({ recipients: mockRecipients });
    render(<EmailCampaignView showPageHeader={false} />);
    expect(screen.getByText('Recipient type')).toBeInTheDocument();
    expect(screen.getByText('Audience size')).toBeInTheDocument();
    const countSpans = screen.getAllByText('2');
    expect(countSpans.length).toBeGreaterThanOrEqual(1);
  });

  it('Save Campaign adds a draft campaign', async () => {
    setupMocks({ recipients: mockRecipients });
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save Campaign/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Campaign name/i), { target: { value: 'My campaign' } });
    fireEvent.change(screen.getByLabelText(/Subject line/i), { target: { value: 'Hello' } });
    fireEvent.change(screen.getByPlaceholderText(/Write your email content/i), { target: { value: 'Body text' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Campaign/i }));
    await waitFor(() => {
      expect(screen.getByTestId('campaign-count')).toHaveTextContent('1');
    }, { timeout: 600 });
    expect(screen.getByTestId('first-campaign-name')).toHaveTextContent('My campaign');
    expect(screen.getByTestId('first-campaign-status')).toHaveTextContent('draft');
  });

  it('Save Campaign uses "Untitled email campaign" when name empty but subject/body set', async () => {
    setupMocks({ recipients: mockRecipients });
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save Campaign/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/Write your email content/i), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Campaign/i }));
    await waitFor(() => {
      expect(screen.getByTestId('first-campaign-name')).toHaveTextContent('Untitled email campaign');
    }, { timeout: 600 });
  });

  it('Send Now sends campaign and clears form on success', async () => {
    setupMocks({
      recipients: mockRecipients,
      provider: { provider: { providerType: 'resend', senderEmail: 'noreply@example.com' }, adapter: {} },
    });
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Campaign name/i), { target: { value: 'Send test' } });
    fireEvent.change(screen.getByLabelText(/Subject line/i), { target: { value: 'Test subject' } });
    fireEvent.change(screen.getByPlaceholderText(/Write your email content/i), { target: { value: 'Hi everyone' } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Now/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Now/i }));
    await waitFor(() => {
      expect(providerRegistry.sendCampaign).toHaveBeenCalledWith('email', expect.objectContaining({
        subject: 'Test subject',
        body: 'Hi everyone',
        recipients: expect.arrayContaining([
          expect.objectContaining({ id: 'r1', email: 'alice@test.com', name: 'Alice' }),
          expect.objectContaining({ id: 'r2', email: 'bob@test.com', name: 'Bob' }),
        ]),
      }), undefined);
    });
    await waitFor(() => {
      expect(screen.getByTestId('first-campaign-status')).toHaveTextContent('sent');
    });
    expect(screen.getByLabelText(/Campaign name/i)).toHaveDisplayValue('');
    expect(screen.getByLabelText(/Subject line/i)).toHaveDisplayValue('');
    expect(screen.getByPlaceholderText(/Write your email content/i)).toHaveValue('');
  });

  it('Send Now adds failed campaign when send fails', async () => {
    setupMocks({
      recipients: mockRecipients,
      provider: { provider: { providerType: 'resend' }, adapter: {} },
      sendResult: { success: false, error: 'Provider error' },
    });
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Subject line/i), { target: { value: 'Subj' } });
    fireEvent.change(screen.getByPlaceholderText(/Write your email content/i), { target: { value: 'Hi' } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Now/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Now/i }));
    await waitFor(() => {
      expect(screen.getByTestId('first-campaign-status')).toHaveTextContent('failed');
    });
  });

  it('Send Test Email calls sendTestMessage when provider and body set', async () => {
    setupMocks({
      provider: { provider: { providerType: 'resend' }, adapter: {} },
    });
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Test Email/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/Write your email content/i), { target: { value: 'Test body' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Test Email/i }));
    await waitFor(() => {
      expect(providerRegistry.sendTestMessage).toHaveBeenCalledWith('email', expect.objectContaining({
        body: 'Test body',
        channel: 'email',
        subject: '(Test)',
      }), undefined);
    });
  });

  it('Insert variable appends placeholder to body', async () => {
    render(<EmailCampaignView showPageHeader={false} />);
    fireEvent.change(screen.getByPlaceholderText(/Write your email content/i), { target: { value: 'Hi ' } });
    fireEvent.click(screen.getByRole('button', { name: /Insert variables/i }));
    fireEvent.click(screen.getByText('First name'));
    expect(screen.getByPlaceholderText(/Write your email content/i)).toHaveValue('Hi  {{first_name}}');
  });

  it('recipient summary shows Team Members when recipient group is team', async () => {
    setupMocks({ recipients: mockRecipients });
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Set Team/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Set Team/i }));
    await waitFor(() => {
      expect(screen.getByText('Team Members')).toBeInTheDocument();
    });
  });

  it('buildEmailRecipients uses selected subset when audience is SELECTED', async () => {
    setupMocks({
      recipients: mockRecipients,
      provider: { provider: { providerType: 'resend', senderEmail: 'noreply@example.com' }, adapter: {} },
    });
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Set Selected/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Set Selected/i }));
    fireEvent.click(screen.getByRole('button', { name: /Select r1/i }));
    fireEvent.change(screen.getByLabelText(/Subject line/i), { target: { value: 'Hi' } });
    fireEvent.change(screen.getByPlaceholderText(/Write your email content/i), { target: { value: 'Body' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Now/i }));
    await waitFor(() => {
      expect(providerRegistry.sendCampaign).toHaveBeenCalledWith('email', expect.objectContaining({
        recipients: [expect.objectContaining({ id: 'r1', name: 'Alice', email: 'alice@test.com' })],
      }), undefined);
    });
  });

  it('Send Test Email disabled when no provider or no body', async () => {
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Test Email/i })).toBeDisabled();
    });
  });

  it('ProviderInfoCard shows warning when senderEmail not set', async () => {
    setupMocks({
      provider: {
        provider: { providerType: 'resend' },
        adapter: { getProviderStatus: () => Promise.resolve({ status: 'connected' }) },
      },
    });
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('provider-warning')).toHaveTextContent('Verify sender identity');
  });

  it('preview shows subject and body or placeholders', () => {
    render(<EmailCampaignView showPageHeader={false} />);
    expect(screen.getByText(/Subject: —/)).toBeInTheDocument();
    expect(screen.getByText(/Email preview will appear here/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Subject line/i), { target: { value: 'My subject' } });
    fireEvent.change(screen.getByPlaceholderText(/Write your email content/i), { target: { value: 'Preview text' } });
    expect(screen.getByText(/Subject: My subject/)).toBeInTheDocument();
    expect(screen.getAllByText('Preview text').length).toBeGreaterThanOrEqual(1);
  });

  it('warns when Send Test Email fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setupMocks({
      provider: { provider: { providerType: 'resend' }, adapter: {} },
      testMessageResult: { success: false, error: 'Test email failed' },
    });
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/Write your email content/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Test Email/i }));
    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Test email failed:', 'Test email failed');
    });
    warnSpy.mockRestore();
  });

  it('Send Test Email passes subject when set', async () => {
    setupMocks({
      provider: { provider: { providerType: 'resend' }, adapter: {} },
    });
    render(<EmailCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Test Email/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Subject line/i), { target: { value: 'Test subject' } });
    fireEvent.change(screen.getByPlaceholderText(/Write your email content/i), { target: { value: 'Body' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Test Email/i }));
    await waitFor(() => {
      expect(providerRegistry.sendTestMessage).toHaveBeenCalledWith('email', expect.objectContaining({
        subject: 'Test subject',
      }), undefined);
    });
  });
});
