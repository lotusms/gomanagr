import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordPage from '@/pages/forgot-password';

const mockUseRouter = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => mockUseRouter(),
}));

const mockResetPassword = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Forgot Password Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      pathname: '/forgot-password',
      query: {},
      asPath: '/forgot-password',
    });
    mockUseAuth.mockReturnValue({
      resetPassword: mockResetPassword,
    });
  });

  it('renders the forgot password form', () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByText(/enter your email to receive a password reset link/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/login');
  });

  it('shows validation error for invalid or empty email', async () => {
    render(<ForgotPasswordPage />);

    fireEvent.submit(screen.getByRole('button', { name: /send reset link/i }).closest('form'));

    await waitFor(() => {
      expect(screen.getAllByText(/please enter a valid email address/i).length).toBeGreaterThan(0);
    });
    expect(mockResetPassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'notanemail' } });
    fireEvent.submit(screen.getByRole('button', { name: /send reset link/i }).closest('form'));

    await waitFor(() => {
      expect(screen.getAllByText(/please enter a valid email address/i).length).toBeGreaterThan(0);
    });
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('shows success message after submitting valid email', async () => {
    mockResetPassword.mockResolvedValue(undefined);

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    const backLinks = screen.getAllByRole('link', { name: /back to sign in/i });
    expect(backLinks.some((l) => l.getAttribute('href') === '/login')).toBe(true);
    expect(mockResetPassword).toHaveBeenCalledWith('user@example.com');
  });

  it('shows error message when reset fails', async () => {
    mockResetPassword.mockRejectedValue(new Error('User not found'));

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'unknown@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/user not found/i).length).toBeGreaterThan(0);
    });
    expect(mockResetPassword).toHaveBeenCalledWith('unknown@example.com');
  });

  it('shows loading state while sending', async () => {
    let resolveReset;
    mockResetPassword.mockImplementation(() => new Promise((r) => { resolveReset = r; }));

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByText(/sending/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();

    resolveReset();
    await waitFor(() => {
      expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument();
    });
  });
});
