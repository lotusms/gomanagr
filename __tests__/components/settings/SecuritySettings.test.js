/**
 * Unit tests for SecuritySettings: render heading, PIN section, set/change PIN, error paths
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SecuritySettings from '@/components/settings/SecuritySettings';

const currentUser = { uid: 'u1', email: 'u@test.com' };
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser }),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock('@/components/ui/Toast', () => ({ useToast: () => mockToast }));

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, type, disabled }) => (
    <button type={type || 'button'} disabled={disabled} data-testid="primary-btn">{children}</button>
  ),
}));

jest.mock('react-icons/hi', () => ({
  HiLockClosed: () => <span data-testid="icon-lock-closed" />,
  HiCheck: () => <span data-testid="icon-check" />,
  HiChevronDown: () => <span data-testid="icon-chevron-down" />,
}));

describe('SecuritySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isSet: false }),
    });
  });

  it('renders Security heading, description, and coming soon message', async () => {
    render(<SecuritySettings />);
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByText(/password, two-factor/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/More security options coming soon/)).toBeInTheDocument();
    });
  });

  it('shows Credentials reveal PIN section after loading', async () => {
    render(<SecuritySettings />);
    await waitFor(() => {
      expect(screen.getByText(/Credentials reveal PIN/)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/PIN/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set PIN' })).toBeInTheDocument();
  });

  it('treats non-ok status as PIN not set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    render(<SecuritySettings />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Set PIN' })).toBeInTheDocument();
    });
    expect(screen.queryByText(/PIN is set/)).not.toBeInTheDocument();
  });

  it('treats fetch error as PIN not set', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    render(<SecuritySettings />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Set PIN' })).toBeInTheDocument();
    });
    expect(screen.queryByText(/PIN is set/)).not.toBeInTheDocument();
  });

  it('shows PIN is set and Change PIN when status returns isSet true', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isSet: true }),
    });
    render(<SecuritySettings />);
    await waitFor(() => {
      expect(screen.getByText(/PIN is set/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Change PIN' })).toBeInTheDocument();
  });

  it('validates PIN length and shows error when too short', async () => {
    render(<SecuritySettings />);
    await waitFor(() => expect(screen.getByLabelText(/PIN/)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/PIN/), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Set PIN' }));
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/4–8 characters/));
    expect(global.fetch).not.toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: expect.stringContaining('"action":"set"') }));
  });

  it('validates PIN length and shows error when too long', async () => {
    render(<SecuritySettings />);
    await waitFor(() => expect(screen.getByLabelText(/PIN/)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/PIN/), '123456789');
    await userEvent.click(screen.getByRole('button', { name: 'Set PIN' }));
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/4–8 characters/));
  });

  it('sends set PIN and shows success when valid', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ isSet: false }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(<SecuritySettings />);
    await waitFor(() => expect(screen.getByLabelText(/PIN/)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/PIN/), '1234');
    await userEvent.click(screen.getByRole('button', { name: 'Set PIN' }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Credentials reveal PIN saved.'));
    const lastCall = global.fetch.mock.calls[global.fetch.mock.calls.length - 1];
    expect(lastCall[0]).toBe('/api/settings/reveal-pin');
    expect(lastCall[1].method).toBe('POST');
    expect(lastCall[1].body).toContain('"action":"set"');
    expect(lastCall[1].body).toContain('"pin":"1234"');
  });

  it('shows error when set PIN API returns not ok', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ isSet: false }) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) });
    render(<SecuritySettings />);
    await waitFor(() => expect(screen.getByLabelText(/PIN/)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/PIN/), '1234');
    await userEvent.click(screen.getByRole('button', { name: 'Set PIN' }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Server error'));
  });

  it('shows error when set PIN fetch throws', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ isSet: false }) })
      .mockRejectedValueOnce(new Error('Network failed'));
    render(<SecuritySettings />);
    await waitFor(() => expect(screen.getByLabelText(/PIN/)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/PIN/), '1234');
    await userEvent.click(screen.getByRole('button', { name: 'Set PIN' }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
  });

  it('shows Not connected badge when PIN is not set', async () => {
    render(<SecuritySettings />);
    await waitFor(() => {
      expect(screen.getByText(/Credentials reveal PIN/)).toBeInTheDocument();
    });
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('shows Connected badge when PIN is set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isSet: true }),
    });
    render(<SecuritySettings />);
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('collapsible section toggles content: collapsed hides form, expanded shows it', async () => {
    render(<SecuritySettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/PIN/)).toBeInTheDocument();
    });
    const sectionButton = screen.getByRole('button', { name: /Credentials reveal PIN/ });

    await userEvent.click(sectionButton);
    expect(screen.queryByLabelText(/PIN/)).not.toBeInTheDocument();

    await userEvent.click(sectionButton);
    expect(screen.getByLabelText(/PIN/)).toBeInTheDocument();
  });
});
