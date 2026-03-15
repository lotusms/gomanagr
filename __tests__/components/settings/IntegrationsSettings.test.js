/**
 * Unit tests for IntegrationsSettings: loading, no-org empty state, provider sections, status badge, save/test.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';

const currentUser = { uid: 'u1', email: 'u@test.com' };
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser }),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock('@/components/ui/Toast', () => ({ useToast: () => mockToast }));

const mockGetUserOrganization = jest.fn();
jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-testid="primary-btn">{children}</button>
  ),
  SecondaryButton: ({ children, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-testid="secondary-btn">{children}</button>
  ),
}));
jest.mock('@/components/ui/InputField', () => function MockInputField({ id, label, value, onChange }) {
  return (
    <div data-testid={`input-${id}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value || ''} onChange={onChange} />
    </div>
  );
});
jest.mock('@/components/dashboard/CollapsibleSection', () => function MockCollapsibleSection({ title, children, trailing }) {
  return (
    <div data-testid={`section-${title}`}>
      <span>{title}</span>
      {trailing}
      <div className="section-content">{children}</div>
    </div>
  );
});
jest.mock('@/components/ui/EmptyState', () => function MockEmptyState({ title, description }) {
  return (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
});
jest.mock('@/components/ui', () => ({
  EmptyState: require('@/components/ui/EmptyState').default,
}));
jest.mock('@/components/marketing/ProviderStatusBadge', () => function MockProviderStatusBadge({ status }) {
  return <span data-testid="provider-status-badge" data-status={status}>{status}</span>;
});
jest.mock('@/components/settings/MarketingProviderSettings', () => function MockMarketingProviderSettings() {
  return <div data-testid="marketing-provider-settings" />;
});
jest.mock('react-icons/hi', () => ({
  HiCreditCard: () => <span data-testid="icon-credit" />,
  HiSpeakerphone: () => <span data-testid="icon-speaker" />,
  HiMail: () => <span data-testid="icon-mail" />,
}));

describe('IntegrationsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserOrganization.mockResolvedValue({ id: 'org1', name: 'Test Org' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ integrations: [] }),
    });
  });

  it('shows loading then heading Integrations', async () => {
    render(<IntegrationsSettings />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('section-Stripe')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Integrations' })).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('shows Organization required when no org', async () => {
    mockGetUserOrganization.mockResolvedValueOnce(null);
    render(<IntegrationsSettings />);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
    expect(screen.getByText('Organization required')).toBeInTheDocument();
    expect(screen.getByText(/create or join an organization/)).toBeInTheDocument();
  });

  it('loads integrations via fetch and renders provider sections', async () => {
    render(<IntegrationsSettings />);
    await waitFor(() => expect(screen.getByTestId('section-Stripe')).toBeInTheDocument());
    expect(screen.getByTestId('section-Twilio')).toBeInTheDocument();
    expect(screen.getByTestId('section-Mailchimp')).toBeInTheDocument();
    expect(screen.getByTestId('section-Resend')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/integrations?'));
  });

  it('maps integration status to badge: connected, invalid -> misconfigured', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        integrations: [
          { provider: 'stripe', status: 'connected' },
          { provider: 'twilio', status: 'invalid' },
        ],
      }),
    });
    render(<IntegrationsSettings />);
    await waitFor(() => expect(screen.getByTestId('section-Stripe')).toBeInTheDocument());
    const badges = screen.getAllByTestId('provider-status-badge');
    const statuses = badges.map((b) => b.getAttribute('data-status'));
    expect(statuses).toContain('connected');
    expect(statuses).toContain('misconfigured');
  });

  it('Save calls POST /api/integrations and shows success', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ integrations: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ integrations: [] }) });
    render(<IntegrationsSettings />);
    await waitFor(() => expect(screen.getByTestId('section-Stripe')).toBeInTheDocument());
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    await userEvent.click(saveButtons[0]);
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Saved successfully.', 3000));
    expect(global.fetch).toHaveBeenCalledWith('/api/integrations', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"action":"save"'),
    }));
  });

  it('Test connection calls POST with action test', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ integrations: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) });
    render(<IntegrationsSettings />);
    await waitFor(() => expect(screen.getByTestId('section-Stripe')).toBeInTheDocument());
    const testButtons = screen.getAllByRole('button', { name: 'Test connection' });
    await userEvent.click(testButtons[0]);
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Connection test passed.', 3000));
    expect(global.fetch).toHaveBeenCalledWith('/api/integrations', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"action":"test"'),
    }));
  });
});
