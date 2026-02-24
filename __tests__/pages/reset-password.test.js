import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetPasswordPage from '@/pages/reset-password';

const mockPush = jest.fn();
const mockUseRouter = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => mockUseRouter(),
}));

const mockResetPasswordWithToken = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockOnAuthStateChange = jest.fn();
const mockGetSession = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb) => {
        mockOnAuthStateChange(cb);
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
      getSession: () => mockGetSession(),
      signOut: () => mockSignOut(),
    },
  },
}));

describe('Reset Password Page', () => {
  const originalHash = window.location.hash;

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.hash = '';
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      pathname: '/reset-password',
      query: {},
      asPath: '/reset-password',
    });
    mockUseAuth.mockReturnValue({
      resetPasswordWithToken: mockResetPasswordWithToken,
      currentUser: null,
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  afterEach(() => {
    window.location.hash = originalHash;
  });

  it('shows verifying state while checking token', () => {
    mockGetSession.mockImplementation(() => new Promise(() => {}));

    render(<ResetPasswordPage />);

    expect(screen.getByText(/verifying reset link/i)).toBeInTheDocument();
  });

  it('shows invalid link message when no valid session or recovery', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired link/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/please request a new one/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request new reset link/i })).toHaveAttribute('href', '/forgot-password');
  });

  it('shows set new password form when session is valid', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/enter your new password below/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter new password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/login');
  });

  it('validates password length and match', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/enter new password/i), { target: { value: '12345' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/password must be at least 6 characters/i).length).toBeGreaterThan(0);
    });
    expect(mockResetPasswordWithToken).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/enter new password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/passwords do not match/i).length).toBeGreaterThan(0);
    });
    expect(mockResetPasswordWithToken).not.toHaveBeenCalled();
  });

  it('shows success and redirects after reset', async () => {
    jest.useFakeTimers();
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });
    mockResetPasswordWithToken.mockResolvedValue(undefined);

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/enter new password/i), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), { target: { value: 'newpassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/redirecting to login/i)).toBeInTheDocument();
    expect(mockResetPasswordWithToken).toHaveBeenCalledWith('newpassword123');

    jest.advanceTimersByTime(2000);
    expect(mockPush).toHaveBeenCalledWith('/login');

    jest.useRealTimers();
  });

  it('shows error when reset fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });
    mockResetPasswordWithToken.mockRejectedValue(new Error('Token expired'));

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/enter new password/i), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), { target: { value: 'newpassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/token expired/i).length).toBeGreaterThan(0);
    });
    expect(mockResetPasswordWithToken).toHaveBeenCalledWith('newpassword123');
  });
});
