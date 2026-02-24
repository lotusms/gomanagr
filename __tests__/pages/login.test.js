import { render, screen } from '@testing-library/react';
import LoginPage from '@/pages/login';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseRouter = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => mockUseRouter(),
}));

jest.mock('@/services/userService', () => ({
  getUserAccount: jest.fn(),
}));

const mockLogin = jest.fn();
const mockSignup = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      pathname: '/login',
      query: {},
      asPath: '/login',
    });
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      login: mockLogin,
      signup: mockSignup,
      logout: jest.fn(),
    });
  });

  it('renders the login form when not loading and no user', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByText(/sign in to continue to your dashboard/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();

    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');

    const signInButton = screen.getByRole('button', { name: 'Sign In' });
    expect(signInButton).toBeInTheDocument();
    expect(signInButton).toHaveAttribute('type', 'submit');

    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/signup');
  });

  it('renders loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: true,
      login: mockLogin,
      signup: mockSignup,
      logout: jest.fn(),
    });

    render(<LoginPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows revoked message when query.revoked is 1', () => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      pathname: '/login',
      query: { revoked: '1' },
      asPath: '/login?revoked=1',
    });

    render(<LoginPage />);

    expect(screen.getByText(/your access was revoked/i)).toBeInTheDocument();
    expect(screen.getByText(/contact your admin to request access again/i)).toBeInTheDocument();
  });
});
