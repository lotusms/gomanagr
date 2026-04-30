import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useUserAccount } from '@/lib/UserAccountContext';
import { getUserOrganization } from '@/services/organizationService';
import AIAgentChat from '@/components/ai/AIAgentChat';

const STORAGE_KEY = 'gomanagr_ai_agent_chat_v1';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/UserAccountContext', () => ({
  useUserAccount: jest.fn(),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: jest.fn(),
}));

function setupDefaultMocks() {
  useRouter.mockReturnValue({
    push: jest.fn(),
    pathname: '/dashboard',
    query: {},
    asPath: '/dashboard',
  });
  useAuth.mockReturnValue({
    currentUser: { uid: 'user-1', displayName: 'Test User', email: 'test@example.com', photoURL: '' },
  });
  useUserAccount.mockReturnValue({
    account: { firstName: 'Test', lastName: 'User', photoUrl: '' },
    preview: null,
  });
  getUserOrganization.mockResolvedValue({
    id: 'org-1',
    logo_url: '',
    membership: { role: 'admin' },
  });
}

async function renderWithOrg(ui) {
  const result = render(ui);
  await waitFor(() => expect(getUserOrganization).toHaveBeenCalled());
  return result;
}

async function renderWithoutOrgFetch(ui) {
  const result = render(ui);
  await waitFor(() => expect(screen.getByText(/hi! i'm hermes/i)).toBeInTheDocument());
  return result;
}

describe('AIAgentChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    setupDefaultMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Assistant reply.' }),
      })
    );
  });

  it('shows default Hermes greeting when localStorage is empty', async () => {
    await renderWithOrg(<AIAgentChat />);
    expect(
      screen.getByText(/hi! i'm hermes/i)
    ).toBeInTheDocument();
  });

  it('loads prior messages from localStorage when present', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ role: 'assistant', content: 'Stored hello', createdAt: '2020-01-01T12:00:00.000Z' }])
    );
    await renderWithOrg(<AIAgentChat />);
    expect(screen.getByText('Stored hello')).toBeInTheDocument();
  });

  it('ignores invalid JSON in localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{');
    await renderWithOrg(<AIAgentChat />);
    expect(screen.getByText(/hi! i'm hermes/i)).toBeInTheDocument();
  });

  it('does not fetch organization when user is not signed in', async () => {
    useAuth.mockReturnValue({ currentUser: null });
    await renderWithoutOrgFetch(<AIAgentChat />);
    expect(getUserOrganization).not.toHaveBeenCalled();
  });

  it('treats failed organization load as no org', async () => {
    getUserOrganization.mockRejectedValueOnce(new Error('network'));
    await renderWithOrg(<AIAgentChat />);
    expect(screen.getByText(/hi! i'm hermes/i)).toBeInTheDocument();
  });

  it('sends a message on button click and appends assistant response', async () => {
    const user = userEvent.setup();
    await renderWithOrg(<AIAgentChat />);
    await user.type(screen.getByPlaceholderText(/ask hermes/i), 'What is 2+2?');
    await user.click(screen.getByTitle('Send'));

    await waitFor(() => {
      expect(screen.getByText('Assistant reply.')).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ai-agent/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.userId).toBe('user-1');
    expect(body.organizationId).toBe('org-1');
    expect(body.messages.some((m) => m.role === 'user' && m.content === 'What is 2+2?')).toBe(true);
  });

  it('sends on Enter without Shift', async () => {
    const user = userEvent.setup();
    await renderWithOrg(<AIAgentChat />);
    const field = screen.getByPlaceholderText(/ask hermes/i);
    await user.type(field, 'Hello{Enter}');
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('shows API error when response is not ok', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Rate limited' }),
      })
    );
    const user = userEvent.setup();
    await renderWithOrg(<AIAgentChat />);
    await user.type(screen.getByPlaceholderText(/ask hermes/i), 'Ping');
    await user.click(screen.getByTitle('Send'));
    await waitFor(() => {
      expect(screen.getByText('Rate limited')).toBeInTheDocument();
    });
  });

  it('expand navigates to full AI agent page', async () => {
    const user = userEvent.setup();
    const push = jest.fn();
    useRouter.mockReturnValue({ push, pathname: '/', query: {}, asPath: '/' });
    await renderWithOrg(<AIAgentChat showExpand />);
    await user.click(screen.getByRole('button', { name: /expand/i }));
    expect(push).toHaveBeenCalledWith('/dashboard/ai-agent');
  });

  it('collapse button calls onCollapse when provided', async () => {
    const user = userEvent.setup();
    const onCollapse = jest.fn();
    await renderWithOrg(<AIAgentChat showExpand onCollapse={onCollapse} />);
    await user.click(screen.getByTitle('Collapse chat'));
    expect(onCollapse).toHaveBeenCalled();
  });

  it('resetSignal clears chat and localStorage', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ role: 'user', content: 'Old', createdAt: '2020-01-01T00:00:00.000Z' }])
    );
    const { rerender } = await renderWithOrg(<AIAgentChat resetSignal={0} />);
    await waitFor(() => expect(screen.getByText('Old')).toBeInTheDocument());

    rerender(<AIAgentChat resetSignal={1} />);
    await waitFor(() => {
      expect(screen.queryByText('Old')).not.toBeInTheDocument();
      expect(screen.getByText(/hi! i'm hermes/i)).toBeInTheDocument();
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(stored.some((m) => m.content === 'Old')).toBe(false);
    expect(stored.some((m) => String(m.content || '').includes('Hermes'))).toBe(true);
  });

  it('Re-ask sends the same question again', async () => {
    const user = userEvent.setup();
    await renderWithOrg(<AIAgentChat />);
    await user.type(screen.getByPlaceholderText(/ask hermes/i), 'Same Q');
    await user.click(screen.getByTitle('Send'));
    await waitFor(() => expect(screen.getByText('Assistant reply.')).toBeInTheDocument());

    global.fetch.mockClear();
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Second answer.' }),
    });

    const reAskButtons = screen.getAllByRole('button', { name: /re-ask/i });
    await user.click(reAskButtons[reAskButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Second answer.')).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalled();
  });

  it('disables send when input is empty', async () => {
    await renderWithOrg(<AIAgentChat />);
    expect(screen.getByTitle('Send')).toBeDisabled();
  });

  it('uses compact height class when compact', async () => {
    const { container } = await renderWithOrg(<AIAgentChat compact />);
    expect(container.querySelector('.h-52')).toBeTruthy();
  });
});
