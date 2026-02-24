import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import SignupPage from '@/pages/signup';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseRouter = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => mockUseRouter(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

jest.mock('@/services/userService', () => ({
  createUserAccount: jest.fn().mockResolvedValue({}),
}));

const mockSignup = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/utils/emailCheck', () => ({
  checkEmailExists: jest.fn().mockResolvedValue({ exists: false, methods: [] }),
}));

describe('Signup / Registration Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      pathname: '/signup',
      query: {},
      asPath: '/signup',
    });
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      signup: mockSignup,
      login: jest.fn(),
      logout: jest.fn(),
    });
  });

  it('renders loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: true,
      signup: mockSignup,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<SignupPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders step 1 of registration with email, password, and progress', () => {
    render(<SignupPage />);

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByText(/start your free trial/i)).toBeInTheDocument();

    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();

    expect(screen.getByPlaceholderText(/at least 6 characters/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/at least 6 characters/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm your password/i)).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /^next$/i });
    expect(nextButton).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();
    expect(backButton).toBeDisabled();
  });

  it('shows free trial checkbox on step 1', () => {
    render(<SignupPage />);

    expect(screen.getByText(/free trial enabled/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'trial');
  });

  it('advances to step 2 when step 1 is valid and user clicks Next', async () => {
    const { checkEmailExists } = require('@/utils/emailCheck');
    checkEmailExists.mockResolvedValue({ exists: false, methods: [] });

    render(<SignupPage />);

    const emailInput = screen.getByPlaceholderText(/you@example\.com/i);
    const passwordInput = screen.getByPlaceholderText(/at least 6 characters/i);
    const confirmInput = screen.getByPlaceholderText(/confirm your password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });

    await new Promise((r) => setTimeout(r, 200));

    const nextButton = screen.getByRole('button', { name: /^next$/i });
    fireEvent.click(nextButton);

    expect(screen.getByText(/step 2 of 6/i)).toBeInTheDocument();
  });

  it('shows validation when passwords do not match', async () => {
    const { checkEmailExists } = require('@/utils/emailCheck');
    checkEmailExists.mockResolvedValue({ exists: false, methods: [] });

    render(<SignupPage />);

    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/at least 6 characters/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), { target: { value: 'different' } });

    await new Promise((r) => setTimeout(r, 200));

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();
  });

  it('shows "email already used" and blocks Next when checkEmailExists returns exists: true', async () => {
    const { checkEmailExists } = require('@/utils/emailCheck');
    checkEmailExists.mockResolvedValue({ exists: true, methods: ['email'] });

    render(<SignupPage />);

    const emailInput = screen.getByPlaceholderText(/you@example\.com/i);
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'taken@example.com' } });
      fireEvent.blur(emailInput);
    });

    await waitFor(() => {
      expect(screen.getByText(/this user already exists/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login');

    const nextButton = screen.getByRole('button', { name: /^next$/i });
    expect(nextButton).toBeDisabled();
    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();
  });
});
