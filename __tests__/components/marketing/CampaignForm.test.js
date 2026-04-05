/**
 * Unit tests for CampaignForm: render and basic interaction.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CampaignForm from '@/components/marketing/CampaignForm';

const mockSendCampaign = jest.fn();
const mockSendTestMessage = jest.fn();
const mockGetActiveProviderForChannel = jest.fn();

jest.mock('@/lib/UserAccountContext', () => ({
  useUserAccount: () => ({ account: { industry: null } }),
}));
jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() }),
}));
jest.mock('@/services/organizationService', () => ({ getUserOrganization: jest.fn(() => Promise.resolve(null)) }));
jest.mock('@/services/userService', () => ({ getUserAccount: jest.fn(() => Promise.resolve(null)) }));
jest.mock('@/lib/marketing/providerRegistry', () => ({
  getActiveProviderForChannel: (...args) => mockGetActiveProviderForChannel(...args),
  getProviderCapabilities: () => ({ email: true, sms: false }),
  sendCampaign: (...args) => mockSendCampaign(...args),
  sendTestMessage: (...args) => mockSendTestMessage(...args),
  PROVIDER_DISPLAY_NAMES: {},
}));
jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: () => 'Clients',
}));
jest.mock('@/components/marketing/RecipientSelector', () => function MockRecipientSelector() {
  return <div data-testid="recipient-selector">RecipientSelector</div>;
});
jest.mock('@/components/marketing/ProviderWarningBanner', () => function MockBanner() {
  return <div data-testid="provider-warning-banner">ProviderWarningBanner</div>;
});
jest.mock('@/components/marketing/ProviderInfoCard', () => function MockInfoCard() {
  return <div data-testid="provider-info-card">ProviderInfoCard</div>;
});
jest.mock('@/components/ui/InputField', () => function MockInputField({ id, label, value, onChange }) {
  return (
    <div data-testid={`input-${id}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value || ''} onChange={onChange} data-testid={`input-${id}-field`} />
    </div>
  );
});
jest.mock('@/components/ui/TextareaInput', () => function MockTextarea({ id, label, value, onChange }) {
  return (
    <div data-testid={`textarea-${id}`}>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value || ''} onChange={onChange} data-testid={`textarea-${id}-field`} />
    </div>
  );
});
jest.mock('@/components/ui/Dropdown', () => function MockDropdown({ id, label }) {
  return <div data-testid={`dropdown-${id}`}>{label}</div>;
});
jest.mock('@/components/ui/formControlStyles', () => ({ getLabelClasses: () => 'label-class' }));
jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, ...p }) => <button type="button" {...p}>{children}</button>,
  SecondaryButton: ({ children, ...p }) => <button type="button" {...p}>{children}</button>,
}));

const defaultProps = {
  userId: 'user-1',
  organizationId: null,
  defaultChannel: 'email',
  onSuccess: jest.fn(),
  onCancel: jest.fn(),
};

describe('CampaignForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveProviderForChannel.mockResolvedValue(null);
    mockSendCampaign.mockResolvedValue({ success: false });
    mockSendTestMessage.mockResolvedValue({ success: false });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  it('renders campaign name and subject inputs', () => {
    render(<CampaignForm {...defaultProps} />);
    expect(screen.getByTestId('input-campaign-name')).toBeInTheDocument();
    expect(screen.getByTestId('input-campaign-subject')).toBeInTheDocument();
  });

  it('renders RecipientSelector', () => {
    render(<CampaignForm {...defaultProps} />);
    expect(screen.getByTestId('recipient-selector')).toBeInTheDocument();
  });

  it('renders Cancel and Save Draft buttons', () => {
    render(<CampaignForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = jest.fn();
    render(<CampaignForm {...defaultProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('initializes with campaign when provided', () => {
    render(
      <CampaignForm
        {...defaultProps}
        campaign={{
          id: 'c1',
          name: 'My Campaign',
          subject: 'Hello',
          body: 'Body text',
          channel: 'email',
          status: 'draft',
        }}
      />
    );
    expect(screen.getByTestId('input-campaign-name')).toBeInTheDocument();
    expect(screen.getByTestId('input-campaign-subject')).toBeInTheDocument();
  });

  it('calls save API and onSuccess when Save Draft succeeds', async () => {
    const onSuccess = jest.fn();
    const savedCampaign = { id: 'saved-1', name: 'Draft', status: 'draft' };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ campaign: savedCampaign }),
    });
    render(
      <CampaignForm
        {...defaultProps}
        organizationId="org-1"
        onSuccess={onSuccess}
        campaign={{ name: 'Draft', subject: 'Sub', body: 'Body' }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /save draft/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/save-marketing-campaign',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(savedCampaign));
  });

  it('shows toast on save draft failure', async () => {
    const toast = { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() };
    jest.spyOn(require('@/components/ui/Toast'), 'useToast').mockReturnValue(toast);
    global.fetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) });
    render(
      <CampaignForm
        {...defaultProps}
        campaign={{ name: 'Draft', body: 'Body' }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /save draft/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to save campaign. Please try again.'));
  });

  it('provider with getProviderStatus triggers status fetch', async () => {
    const getProviderStatus = jest.fn().mockResolvedValue({ status: 'connected' });
    mockGetActiveProviderForChannel.mockResolvedValue({
      provider: { providerType: 'resend' },
      adapter: { getProviderStatus },
    });
    render(<CampaignForm {...defaultProps} />);
    await waitFor(() => expect(mockGetActiveProviderForChannel).toHaveBeenCalled());
    await waitFor(() => expect(getProviderStatus).toHaveBeenCalled());
  });

  it('fetches Mailchimp meta when email + organizationId + mailchimp provider', async () => {
    mockGetActiveProviderForChannel.mockResolvedValue({
      provider: { providerType: 'mailchimp' },
      adapter: {},
    });
    global.fetch.mockImplementation((url) => {
      if (url === '/api/get-mailchimp-meta') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ connected: true, serverPrefix: 'us21' }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    render(<CampaignForm {...defaultProps} organizationId="org-1" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/get-mailchimp-meta',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ organizationId: 'org-1' }),
        })
      );
    });
  });

  it('Send Now uses registry when not Mailchimp and calls onSuccess on success', async () => {
    mockGetActiveProviderForChannel.mockResolvedValue({
      provider: { providerType: 'resend' },
      adapter: {},
    });
    mockSendCampaign.mockResolvedValue({ success: true });
    const onSuccess = jest.fn();
    const { getUserOrganization } = require('@/services/organizationService');
    getUserOrganization.mockResolvedValue({ id: 'org-1' });
    global.fetch.mockImplementation((url, opts) => {
      if (url === '/api/get-org-clients' && opts?.body) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ clients: [{ id: 'u1', name: 'User', email: 'u@test.com' }] }),
        });
      }
      if (url === '/api/save-marketing-campaign') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ campaign: { id: 'c1', name: 'Camp', status: 'sent' } }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    render(
      <CampaignForm
        {...defaultProps}
        organizationId="org-1"
        onSuccess={onSuccess}
        campaign={{ name: 'Camp', subject: 'Hi', body: 'Message' }}
      />
    );
    await waitFor(() => expect(screen.getByRole('button', { name: /send now/i })).not.toBeDisabled(), { timeout: 3000 });
    await userEvent.click(screen.getByRole('button', { name: /send now/i }));
    await waitFor(() => expect(mockSendCampaign).toHaveBeenCalled());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('switching channel to SMS renders SMS-specific UI', async () => {
    render(<CampaignForm {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /^SMS$/i }));
    await waitFor(() => {
      expect(screen.getByTestId('input-campaign-name')).toBeInTheDocument();
      expect(screen.queryByTestId('input-campaign-subject')).not.toBeInTheDocument();
    });
  });

  it('Send Test Email calls sendTestMessage when provider and body set', async () => {
    mockGetActiveProviderForChannel.mockResolvedValue({
      provider: { providerType: 'resend' },
      adapter: {},
    });
    mockSendTestMessage.mockResolvedValue({ success: true });
    render(
      <CampaignForm
        {...defaultProps}
        campaign={{ name: 'T', subject: 'S', body: 'Test body' }}
      />
    );
    await waitFor(() => expect(screen.getByRole('button', { name: /send test email/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /send test email/i }));
    await waitFor(() => expect(mockSendTestMessage).toHaveBeenCalled());
  });
});
