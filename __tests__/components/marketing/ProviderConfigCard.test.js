/**
 * Unit tests for ProviderConfigCard: render by provider type, enabled switch, test connection, default labels.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProviderConfigCard from '@/components/marketing/ProviderConfigCard';
import { PROVIDER_TYPES } from '@/lib/marketing/types';

const mockGetProviderCapabilities = jest.fn();
const mockValidateProviderConfig = jest.fn();
jest.mock('@/lib/marketing/providerRegistry', () => ({
  getProviderCapabilities: (...args) => mockGetProviderCapabilities(...args),
  validateProviderConfig: (...args) => mockValidateProviderConfig(...args),
  PROVIDER_DISPLAY_NAMES: { twilio: 'Twilio', resend: 'Resend', mailchimp: 'Mailchimp', ses: 'Amazon SES' },
}));
jest.mock('@/components/ui/InputField', () => function MockInputField({ id, label, value, onChange }) {
  return (
    <div data-testid={`input-${id}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={onChange} />
    </div>
  );
});
jest.mock('@/components/ui/Switch', () => function MockSwitch({ id, label, checked, onCheckedChange }) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="checkbox"
        data-testid={`switch-${id}`}
        checked={checked}
        onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
      />
    </label>
  );
});
jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, ...p }) => <button {...p}>{children}</button>,
  SecondaryButton: ({ children, ...p }) => <button {...p}>{children}</button>,
}));
jest.mock('@/components/marketing/ProviderStatusBadge', () => function MockProviderStatusBadge({ status }) {
  return <span data-testid="provider-status-badge">{status}</span>;
});
jest.mock('@/components/marketing/ProviderCapabilityBadges', () => function MockProviderCapabilityBadges() {
  return <span data-testid="provider-capability-badges" />;
});

describe('ProviderConfigCard', () => {
  const defaultConfig = {
    providerType: PROVIDER_TYPES.RESEND,
    enabled: true,
    apiKey: '',
    apiSecret: '',
    senderEmail: '',
    senderName: '',
    fromNumber: '',
    smsEnabled: false,
  };

  beforeEach(() => {
    mockGetProviderCapabilities.mockReturnValue({ email: true, sms: false });
    mockValidateProviderConfig.mockResolvedValue({ valid: true, status: 'connected' });
  });

  it('renders display name from PROVIDER_DISPLAY_NAMES', () => {
    render(<ProviderConfigCard config={{ ...defaultConfig, providerType: 'resend' }} onChange={jest.fn()} />);
    expect(screen.getByText('Resend')).toBeInTheDocument();
  });

  it('renders providerType when not in display names', () => {
    render(<ProviderConfigCard config={{ ...defaultConfig, providerType: 'custom_provider' }} onChange={jest.fn()} />);
    expect(screen.getByText('custom_provider')).toBeInTheDocument();
  });

  it('renders Enabled switch and calls onChange when toggled', async () => {
    const onChange = jest.fn();
    render(<ProviderConfigCard config={defaultConfig} onChange={onChange} />);
    const switchEl = screen.getByTestId('switch-resend-enabled');
    expect(switchEl).toBeChecked();
    await userEvent.click(switchEl);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('shows API Key label; for Twilio shows Account SID', () => {
    render(<ProviderConfigCard config={defaultConfig} onChange={jest.fn()} />);
    expect(screen.getByText('API Key')).toBeInTheDocument();
    const { unmount } = render(
      <ProviderConfigCard config={{ ...defaultConfig, providerType: PROVIDER_TYPES.TWILIO }} onChange={jest.fn()} />
    );
    expect(screen.getByText('Account SID')).toBeInTheDocument();
    unmount();
  });

  it('shows Default for email and Default for SMS when props set', () => {
    render(
      <ProviderConfigCard
        config={defaultConfig}
        onChange={jest.fn()}
        isDefaultEmail
        isDefaultSms
      />
    );
    expect(screen.getByText('Default for email')).toBeInTheDocument();
    expect(screen.getByText('Default for SMS')).toBeInTheDocument();
  });

  it('Test connection button calls validateProviderConfig and onTestConnection', async () => {
    const onTestConnection = jest.fn().mockResolvedValue(undefined);
    render(
      <ProviderConfigCard
        config={defaultConfig}
        onChange={jest.fn()}
        onTestConnection={onTestConnection}
      />
    );
    const btn = screen.getByRole('button', { name: /Test connection/i });
    await userEvent.click(btn);
    expect(mockValidateProviderConfig).toHaveBeenCalledWith(defaultConfig);
    await expect(onTestConnection()).resolves.toBeUndefined();
  });

  it('Test connection is disabled when config.enabled is false', () => {
    render(
      <ProviderConfigCard
        config={{ ...defaultConfig, enabled: false }}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Test connection/i })).toBeDisabled();
  });

  it('calls onChange when API Key input changes', () => {
    const onChange = jest.fn();
    render(<ProviderConfigCard config={defaultConfig} onChange={onChange} />);
    const input = screen.getByTestId('input-resend-apiKey').querySelector('input');
    fireEvent.change(input, { target: { value: 'sk-123' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'sk-123' }));
  });

  it('Twilio: shows Auth Token and From number fields and calls onChange', () => {
    const onChange = jest.fn();
    const twilioConfig = { ...defaultConfig, providerType: PROVIDER_TYPES.TWILIO };
    render(<ProviderConfigCard config={twilioConfig} onChange={onChange} />);
    expect(screen.getByText('Auth Token')).toBeInTheDocument();
    expect(screen.getByText(/From number \(SMS\)/)).toBeInTheDocument();
    const apiSecretInput = screen.getByTestId('input-twilio-apiSecret').querySelector('input');
    const fromNumberInput = screen.getByTestId('input-twilio-fromNumber').querySelector('input');
    fireEvent.change(apiSecretInput, { target: { value: 'secret' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ apiSecret: 'secret' }));
    fireEvent.change(fromNumberInput, { target: { value: '+15551234567' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fromNumber: '+15551234567' }));
  });

  it('Resend: shows Sender email and Sender name and calls onChange', () => {
    const onChange = jest.fn();
    render(<ProviderConfigCard config={defaultConfig} onChange={onChange} />);
    expect(screen.getByLabelText('Sender email')).toBeInTheDocument();
    expect(screen.getByLabelText('Sender name')).toBeInTheDocument();
    const senderEmailInput = screen.getByTestId('input-resend-senderEmail').querySelector('input');
    const senderNameInput = screen.getByTestId('input-resend-senderName').querySelector('input');
    fireEvent.change(senderEmailInput, { target: { value: 'noreply@example.com' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ senderEmail: 'noreply@example.com' }));
    fireEvent.change(senderNameInput, { target: { value: 'My Co' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ senderName: 'My Co' }));
  });

  it('Mailchimp: shows API Secret, sender email/name, from number, and SMS switch', async () => {
    const onChange = jest.fn();
    const mailchimpConfig = {
      ...defaultConfig,
      providerType: PROVIDER_TYPES.MAILCHIMP,
      smsEnabled: false,
    };
    render(<ProviderConfigCard config={mailchimpConfig} onChange={onChange} />);
    expect(screen.getByText('API Secret (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Sender email')).toBeInTheDocument();
    expect(screen.getByLabelText('Sender name')).toBeInTheDocument();
    expect(screen.getByText(/From number \(SMS\)/)).toBeInTheDocument();
    expect(screen.getByText(/Enable SMS/)).toBeInTheDocument();
    const smsSwitch = screen.getByTestId('switch-mailchimp-smsEnabled');
    await userEvent.click(smsSwitch);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ smsEnabled: true }));
  });

  it('renders config.notes when present', () => {
    render(
      <ProviderConfigCard
        config={{ ...defaultConfig, notes: 'Contact support for API access.' }}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText('Contact support for API access.')).toBeInTheDocument();
  });

  it('Test connection shows Testing… while validating', async () => {
    let resolveValidate;
    mockValidateProviderConfig.mockImplementation(() => new Promise((r) => { resolveValidate = r; }));
    render(<ProviderConfigCard config={defaultConfig} onChange={jest.fn()} />);
    const btn = screen.getByRole('button', { name: /Test connection/i });
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: /Testing…/i })).toBeInTheDocument();
    resolveValidate({ valid: true, status: 'connected' });
  });

  it('sets status from validate result when status is provided', async () => {
    mockValidateProviderConfig.mockResolvedValue({ valid: true, status: 'connected' });
    render(<ProviderConfigCard config={defaultConfig} onChange={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Test connection/i }));
    await screen.findByTestId('provider-status-badge');
    expect(screen.getByTestId('provider-status-badge')).toHaveTextContent('connected');
  });

  it('sets status to connected when valid is true and no status', async () => {
    mockValidateProviderConfig.mockResolvedValue({ valid: true });
    render(<ProviderConfigCard config={defaultConfig} onChange={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Test connection/i }));
    await screen.findByTestId('provider-status-badge');
    expect(screen.getByTestId('provider-status-badge')).toHaveTextContent('connected');
  });

  it('sets status to not_connected when valid is false', async () => {
    mockValidateProviderConfig.mockResolvedValue({ valid: false });
    render(<ProviderConfigCard config={defaultConfig} onChange={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Test connection/i }));
    await screen.findByTestId('provider-status-badge');
    expect(screen.getByTestId('provider-status-badge')).toHaveTextContent('not_connected');
  });
});
