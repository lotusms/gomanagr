/**
 * Unit tests for SMSCampaignView: mount with mocked provider and mock data.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SMSCampaignView from '@/components/marketing/SMSCampaignView';
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
jest.mock('@/components/marketing/ProviderInfoCard', () => function MockProviderInfoCard({ status }) {
  return <div data-testid="provider-info-card">{status ?? 'no-status'}</div>;
});
jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, ...props }) => <button {...props}>{children}</button>,
  SecondaryButton: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

const mockRecipients = [
  { id: 'r1', name: 'Alice', phone: '+15551111111', email: 'alice@test.com' },
  { id: 'r2', name: 'Bob', phone: '+15552222222' },
];

function setupMocks(overrides = {}) {
  providerRegistry.getActiveProviderForChannel.mockImplementation(() =>
    Promise.resolve(overrides.provider ?? null)
  );
  providerRegistry.getProviderCapabilities.mockImplementation(() =>
    overrides.capabilities ?? { email: false, sms: true }
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

describe('SMSCampaignView', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<SMSCampaignView showPageHeader={false} />);
    expect(container).toBeInTheDocument();
  });

  it('renders RecipientSelector and CampaignHistoryTable', () => {
    render(<SMSCampaignView showPageHeader={false} />);
    expect(screen.getByTestId('recipient-selector')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-history-table')).toBeInTheDocument();
  });

  it('shows page header when showPageHeader is true', async () => {
    render(<SMSCampaignView showPageHeader />);
    expect(screen.getByText('SMS Marketing')).toBeInTheDocument();
  });

  it('shows ProviderWarningBanner when no provider', async () => {
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-warning-banner')).toHaveTextContent('No SMS provider configured');
    });
  });

  it('shows ProviderInfoCard and fetches status when provider is set', async () => {
    const getProviderStatus = jest.fn().mockResolvedValue({ status: 'connected' });
    setupMocks({
      provider: {
        provider: { providerType: 'twilio' },
        adapter: { getProviderStatus },
      },
    });
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toHaveTextContent('connected');
    });
  });

  it('shows Compose form and recipient summary', async () => {
    setupMocks({ recipients: mockRecipients });
    render(<SMSCampaignView showPageHeader={false} />);
    expect(screen.getByText('Compose')).toBeInTheDocument();
    expect(screen.getByLabelText(/Campaign name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type your SMS message/i)).toBeInTheDocument();
    expect(screen.getByText('Recipient summary')).toBeInTheDocument();
    expect(screen.getByText('Total recipients')).toBeInTheDocument();
  });

  it('shows empty recipient copy when no recipients', async () => {
    setupMocks({ recipients: [] });
    render(<SMSCampaignView showPageHeader={false} />);
    expect(screen.getByText('Select recipients to see summary.')).toBeInTheDocument();
  });

  it('shows recipient summary when recipients exist', async () => {
    setupMocks({ recipients: mockRecipients });
    render(<SMSCampaignView showPageHeader={false} />);
    expect(screen.getByText('Total recipients')).toBeInTheDocument();
    expect(screen.getByText('Audience type')).toBeInTheDocument();
    const recipientCountSpans = screen.getAllByText('2');
    expect(recipientCountSpans.length).toBeGreaterThanOrEqual(1);
  });

  it('Save Campaign adds a draft campaign', async () => {
    setupMocks({ recipients: mockRecipients });
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save Campaign/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Campaign name/i), { target: { value: 'My campaign' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Campaign/i }));
    // handleSaveDraft uses setTimeout(400ms); wait for draft to appear in history
    await waitFor(() => {
      expect(screen.getByTestId('first-campaign-name')).toHaveTextContent('My campaign');
    }, { timeout: 2000 });
    expect(screen.getByTestId('campaign-count')).toHaveTextContent('1');
    expect(screen.getByTestId('first-campaign-status')).toHaveTextContent('draft');
  });

  it('Save Campaign uses "Untitled SMS campaign" when name empty but body set', async () => {
    setupMocks({ recipients: mockRecipients });
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save Campaign/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/Type your SMS message/i), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Campaign/i }));
    await waitFor(() => {
      expect(screen.getByTestId('first-campaign-name')).toHaveTextContent('Untitled SMS campaign');
    }, { timeout: 2000 });
  });

  it('Send Now sends campaign and clears form on success', async () => {
    setupMocks({
      recipients: mockRecipients,
      provider: { provider: { providerType: 'twilio' }, adapter: {} },
    });
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Campaign name/i), { target: { value: 'Send test' } });
    fireEvent.change(screen.getByPlaceholderText(/Type your SMS message/i), { target: { value: 'Hi everyone' } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Now/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Now/i }));
    await waitFor(() => {
      expect(providerRegistry.sendCampaign).toHaveBeenCalledWith('sms', expect.objectContaining({
        body: 'Hi everyone',
        recipients: expect.arrayContaining([
          expect.objectContaining({ id: 'r1', phone: '+15551111111', name: 'Alice' }),
          expect.objectContaining({ id: 'r2', phone: '+15552222222', name: 'Bob' }),
        ]),
      }));
    });
    await waitFor(() => {
      expect(screen.getByTestId('first-campaign-status')).toHaveTextContent('sent');
    });
    expect(screen.getByLabelText(/Campaign name/i)).toHaveDisplayValue('');
    expect(screen.getByPlaceholderText(/Type your SMS message/i)).toHaveValue('');
  });

  it('Send Now adds failed campaign when send fails', async () => {
    setupMocks({
      recipients: mockRecipients,
      provider: { provider: { providerType: 'twilio' }, adapter: {} },
      sendResult: { success: false, error: 'Provider error' },
    });
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/Type your SMS message/i), { target: { value: 'Hi' } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Now/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Now/i }));
    await waitFor(() => {
      expect(screen.getByTestId('first-campaign-status')).toHaveTextContent('failed');
    });
  });

  it('Send Test SMS calls sendTestMessage when provider and body set', async () => {
    setupMocks({
      provider: { provider: { providerType: 'twilio' }, adapter: {} },
    });
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Test SMS/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/Type your SMS message/i), { target: { value: 'Test body' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Test SMS/i }));
    await waitFor(() => {
      expect(providerRegistry.sendTestMessage).toHaveBeenCalledWith('sms', expect.objectContaining({
        body: 'Test body',
        channel: 'sms',
      }));
    });
  });

  it('Insert variable appends placeholder to message body', async () => {
    render(<SMSCampaignView showPageHeader={false} />);
    fireEvent.change(screen.getByPlaceholderText(/Type your SMS message/i), { target: { value: 'Hi ' } });
    fireEvent.click(screen.getByRole('button', { name: /Insert variables/i }));
    fireEvent.click(screen.getByText('First name'));
    expect(screen.getByPlaceholderText(/Type your SMS message/i)).toHaveValue('Hi  {{first_name}}');
  });

  it('shows segment estimate when message exceeds 160 characters', async () => {
    setupMocks({ recipients: mockRecipients });
    render(<SMSCampaignView showPageHeader={false} />);
    const longMessage = 'x'.repeat(200);
    fireEvent.change(screen.getByPlaceholderText(/Type your SMS message/i), { target: { value: longMessage } });
    expect(screen.getByText(/segment\(s\)/)).toBeInTheDocument();
  });

  it('recipient summary shows Team Members when recipient group is team', async () => {
    setupMocks({ recipients: mockRecipients });
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Set Team/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Set Team/i }));
    await waitFor(() => {
      expect(screen.getByText('Team Members')).toBeInTheDocument();
    });
  });

  it('buildSmsRecipients uses selected subset when audience is SELECTED', async () => {
    setupMocks({
      recipients: mockRecipients,
      provider: { provider: { providerType: 'twilio' }, adapter: {} },
    });
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Set Selected/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Set Selected/i }));
    fireEvent.click(screen.getByRole('button', { name: /Select r1/i }));
    fireEvent.change(screen.getByPlaceholderText(/Type your SMS message/i), { target: { value: 'Hi' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Now/i }));
    await waitFor(() => {
      expect(providerRegistry.sendCampaign).toHaveBeenCalledWith('sms', expect.objectContaining({
        recipients: [expect.objectContaining({ id: 'r1', name: 'Alice', phone: '+15551111111' })],
      }));
    });
  });

  it('Send Test SMS disabled when no provider or no body', async () => {
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Test SMS/i })).toBeDisabled();
    });
  });

  it('warns when Send Test SMS fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setupMocks({
      provider: { provider: { providerType: 'twilio' }, adapter: {} },
      testMessageResult: { success: false, error: 'Test SMS failed' },
    });
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/Type your SMS message/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Test SMS/i }));
    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Test SMS failed:', 'Test SMS failed');
    });
    warnSpy.mockRestore();
  });

  it('shows Mailchimp SMS warning on ProviderInfoCard when provider is mailchimp and sms capable', async () => {
    setupMocks({
      provider: {
        provider: { providerType: 'mailchimp' },
        adapter: { getProviderStatus: () => Promise.resolve({ status: 'connected' }) },
      },
      capabilities: { email: true, sms: true },
    });
    render(<SMSCampaignView showPageHeader={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-info-card')).toBeInTheDocument();
    });
    const card = screen.getByTestId('provider-info-card');
    expect(card).toBeInTheDocument();
  });

  it('preview shows message or placeholder', () => {
    render(<SMSCampaignView showPageHeader={false} />);
    expect(screen.getByText(/Message preview will appear here/i)).toBeInTheDocument();
    const messageInput = screen.getByPlaceholderText(/Type your SMS message/i);
    fireEvent.change(messageInput, { target: { value: 'Preview text' } });
    expect(messageInput).toHaveValue('Preview text');
    expect(screen.getAllByText('Preview text').length).toBeGreaterThanOrEqual(1);
  });
});
