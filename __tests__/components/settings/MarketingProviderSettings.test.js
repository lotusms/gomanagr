/**
 * Unit tests for MarketingProviderSettings: loading, heading, Save, default dropdowns, table, ProviderConfigCards, embedInMarketingPage.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarketingProviderSettings from '@/components/settings/MarketingProviderSettings';

const currentUser = { uid: 'u1' };
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser }),
}));

const mockGetMarketingSettings = jest.fn();
const mockSaveMarketingSettings = jest.fn();
jest.mock('@/lib/marketing/marketingSettingsService', () => ({
  getMarketingSettings: (...args) => mockGetMarketingSettings(...args),
  saveMarketingSettings: (...args) => mockSaveMarketingSettings(...args),
}));

const mockGetProviderCapabilities = jest.fn();
jest.mock('@/lib/marketing/providerRegistry', () => ({
  getProviderCapabilities: (...args) => mockGetProviderCapabilities(...args),
  PROVIDER_DISPLAY_NAMES: { resend: 'Resend', twilio: 'Twilio', mailchimp: 'Mailchimp', ses: 'Amazon SES' },
}));

jest.mock('@/components/marketing/ProviderConfigCard', () => function MockProviderConfigCard({ config, onChange }) {
  return (
    <div data-testid={`provider-config-${config.providerType}`}>
      <span>{config.providerType}</span>
      <button type="button" data-testid={`config-change-${config.providerType}`} onClick={() => onChange({ ...config, enabled: !config.enabled })}>
        Toggle
      </button>
    </div>
  );
});
jest.mock('@/components/ui/Table', () => function MockTable({ columns, data, ariaLabel }) {
  return (
    <table role="table" aria-label={ariaLabel}>
      <thead>
        <tr>
          {columns.map((c) => <th key={c.key}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id}>
            {columns.map((c) => (
              <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
});
jest.mock('@/components/ui', () => ({
  Dropdown: function MockDropdown({ id, label, value, onChange, options }) {
    return (
      <div data-testid={`dropdown-${id}`}>
        <label htmlFor={id}>{label}</label>
        <select id={id} value={value || ''} onChange={(e) => onChange && onChange(e)}>
          {(options || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  },
}));
jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-testid="save-btn">{children}</button>
  ),
  SecondaryButton: ({ children, asChild }) =>
    asChild ? children : <button type="button" data-testid="secondary-btn">{children}</button>,
}));
jest.mock('next/link', () => function MockLink({ children, href }) {
  return <a href={href} data-testid="link-marketing">{children}</a>;
});
jest.mock('react-icons/hi', () => ({ HiSpeakerphone: () => <span data-testid="icon-speaker" /> }));

const defaultSettings = {
  providers: [
    { providerType: 'resend', enabled: true, apiKey: '', senderEmail: '', senderName: '' },
    { providerType: 'twilio', enabled: false, apiKey: '', fromNumber: '' },
  ],
  defaultEmailProvider: 'resend',
  defaultSmsProvider: undefined,
};

describe('MarketingProviderSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProviderCapabilities.mockImplementation((p) => ({
      email: p.providerType === 'resend' || p.providerType === 'mailchimp',
      sms: p.providerType === 'twilio' || p.providerType === 'mailchimp',
    }));
    mockGetMarketingSettings.mockResolvedValue(defaultSettings);
    mockSaveMarketingSettings.mockResolvedValue(undefined);
  });

  it('shows loading then content with Marketing providers heading', async () => {
    render(<MarketingProviderSettings />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Marketing providers' })).toBeInTheDocument());
    expect(screen.getByText('Default providers')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Provider capabilities' })).toBeInTheDocument();
  });

  it('renders Save button and calls saveMarketingSettings on click', async () => {
    render(<MarketingProviderSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mockSaveMarketingSettings).toHaveBeenCalledWith(defaultSettings, 'u1'));
  });

  it('renders default email and SMS dropdowns', async () => {
    render(<MarketingProviderSettings />);
    await waitFor(() => expect(screen.getByTestId('dropdown-default-email-provider')).toBeInTheDocument());
    expect(screen.getByTestId('dropdown-default-sms-provider')).toBeInTheDocument();
    expect(screen.getByLabelText('Default email provider')).toBeInTheDocument();
    expect(screen.getByLabelText('Default SMS provider')).toBeInTheDocument();
  });

  it('renders ProviderConfigCard per provider', async () => {
    render(<MarketingProviderSettings />);
    await waitFor(() => expect(screen.getByTestId('provider-config-resend')).toBeInTheDocument());
    expect(screen.getByTestId('provider-config-twilio')).toBeInTheDocument();
  });

  it('when embedInMarketingPage hides heading and Go to Marketing link', async () => {
    render(<MarketingProviderSettings embedInMarketingPage />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Marketing providers' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('link-marketing')).not.toBeInTheDocument();
  });

  it('shows save error when saveMarketingSettings rejects', async () => {
    mockSaveMarketingSettings.mockRejectedValueOnce(new Error('Network error'));
    render(<MarketingProviderSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });
});
