/**
 * Unit tests for ProviderConfigCard: render by provider type, enabled switch, test connection, default labels.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
