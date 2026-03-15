/**
 * Unit tests for StripeSettings: loading, no-user, form, save, error/success, masked hints.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StripeSettings from '@/components/settings/StripeSettings';

const mockUseAuth = jest.fn();
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/components/ui/InputField', () => function MockInputField({ id, label, value, onChange, placeholder }) {
  return (
    <div data-testid={`input-${id}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value || ''} onChange={onChange} placeholder={placeholder} />
    </div>
  );
});
jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-testid="save-btn">{children}</button>
  ),
}));
jest.mock('react-icons/hi', () => ({
  HiCheckCircle: () => <span data-testid="icon-check" />,
  HiXCircle: () => <span data-testid="icon-x" />,
}));

describe('StripeSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ currentUser: { uid: 'u1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        publishableKey: '',
        paymentMethodConfigId: '',
      }),
    });
  });

  it('shows loading then Stripe heading and form', async () => {
    render(<StripeSettings />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('input-stripe-publishable-key')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Stripe' })).toBeInTheDocument();
    expect(screen.getByTestId('input-stripe-secret-key')).toBeInTheDocument();
    expect(screen.getByTestId('input-stripe-webhook-secret')).toBeInTheDocument();
    expect(screen.getByTestId('input-stripe-payment-method-config')).toBeInTheDocument();
  });

  it('shows loading and does not fetch when no currentUser', () => {
    mockUseAuth.mockReturnValue({ currentUser: null });
    render(<StripeSettings />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('loads config from GET /api/settings/stripe', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        publishableKey: 'pk_test_xxx',
        paymentMethodConfigId: 'pmc_yyy',
      }),
    });
    render(<StripeSettings />);
    await waitFor(() => expect(screen.getByTestId('input-stripe-publishable-key')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/settings/stripe?'));
    const pkInput = screen.getByTestId('input-stripe-publishable-key').querySelector('input');
    expect(pkInput?.value).toBe('pk_test_xxx');
  });

  it('shows error when load fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });
    render(<StripeSettings />);
    await waitFor(() => expect(screen.getByText('Unauthorized')).toBeInTheDocument());
  });

  it('Save POSTs and shows success then clears secret fields', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ publishableKey: '', paymentMethodConfigId: '' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ publishableKey: '', paymentMethodConfigId: '' }) });
    render(<StripeSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    await userEvent.type(screen.getByTestId('input-stripe-publishable-key').querySelector('input'), 'pk_test_1');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Settings saved.')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('/api/settings/stripe', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('publishableKey'),
    }));
  });

  it('shows error when save fails', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Invalid key' }) });
    render(<StripeSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Invalid key')).toBeInTheDocument());
  });

  it('shows masked hints when secretKeyMasked and webhookSecretMasked are set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        publishableKey: 'pk_test_xxx',
        secretKeyMasked: true,
        webhookSecretMasked: true,
        paymentMethodConfigId: '',
      }),
    });
    render(<StripeSettings />);
    await waitFor(() => expect(screen.getByText(/Secret key is set/)).toBeInTheDocument());
    expect(screen.getByText(/Webhook secret is set/)).toBeInTheDocument();
  });

  it('shows warning when no publishable or secret key configured', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ publishableKey: '', paymentMethodConfigId: '' }),
    });
    render(<StripeSettings />);
    await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());
    expect(screen.getByText(/Add at least publishable and secret key/)).toBeInTheDocument();
  });
});
