/**
 * Unit tests for MultiStepSignup: step navigation, updateData, validation, handleSubmit, errors
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiStepSignup from '@/components/signup/MultiStepSignup';

const mockPush = jest.fn();
const mockSignup = jest.fn();
const mockCreateUserAccount = jest.fn();
const mockCheckEmailExists = jest.fn();

let routerQuery = {};
jest.mock('next/router', () => ({
  useRouter: () => ({ query: routerQuery, push: mockPush }),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ signup: mockSignup }),
}));

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

jest.mock('@/utils/emailCheck', () => ({
  checkEmailExists: (...args) => mockCheckEmailExists(...args),
}));

jest.mock('@/services/userService', () => ({
  createUserAccount: (...args) => mockCreateUserAccount(...args),
}));

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-testid="primary-btn">{children}</button>
  ),
  SecondaryButton: ({ children, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-testid="secondary-btn">{children}</button>
  ),
}));

/** Fill step 1 and wait for Next to be enabled, then click Next. */
async function completeStep1AndNext() {
  const emailInput = screen.getByPlaceholderText('you@example.com');
  const passwordInput = screen.getByPlaceholderText('At least 6 characters');
  const confirmInput = screen.getByPlaceholderText('Confirm your password');
  fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
  fireEvent.change(passwordInput, { target: { value: 'password123' } });
  fireEvent.change(confirmInput, { target: { value: 'password123' } });
  await waitFor(() => expect(screen.getByTestId('primary-btn')).not.toBeDisabled(), { timeout: 3000 });
  fireEvent.click(screen.getByTestId('primary-btn'));
}

/** Fill step 2 and click Next. */
function completeStep2AndNext() {
  fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Work' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Owner' }));
  fireEvent.click(screen.getByTestId('primary-btn'));
}

/** Fill step 3 and click Next. */
function completeStep3AndNext() {
  fireEvent.change(screen.getByPlaceholderText('Acme Inc.'), { target: { value: 'Acme' } });
  fireEvent.click(screen.getByRole('radio', { name: '1' }));
  fireEvent.click(screen.getByTestId('primary-btn'));
}

/** Fill step 4 and click Next. */
function completeStep4AndNext() {
  fireEvent.click(screen.getByRole('radio', { name: 'Technology' }));
  fireEvent.click(screen.getByTestId('primary-btn'));
}

/** Fill step 5 (select one section) and click Next. */
function completeStep5AndNext() {
  fireEvent.click(screen.getByRole('button', { name: 'Client management' }));
  fireEvent.click(screen.getByTestId('primary-btn'));
}

/** Fill step 6 and click Complete Signup. Uses userEvent so referral state flushes before submit. */
async function completeStep6AndSubmit() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('radio', { name: 'Google' }));
  await user.click(screen.getByTestId('primary-btn'));
}

describe('MultiStepSignup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routerQuery = {};
    mockCheckEmailExists.mockResolvedValue({ exists: false });
    mockSignup.mockResolvedValue({ user: { uid: 'uid-1' } });
    mockCreateUserAccount.mockResolvedValue({});
  });

  it('renders step 1 and progress', () => {
    render(<MultiStepSignup />);
    expect(screen.getByText(/Step 1 of 6/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByTestId('primary-btn')).toHaveTextContent('Next');
    expect(screen.getByTestId('secondary-btn')).toHaveTextContent('Back');
  });

  it('Next is disabled until step 1 has valid email and password', () => {
    render(<MultiStepSignup />);
    expect(screen.getByTestId('primary-btn')).toBeDisabled();
  });

  it('Back on step 1 is disabled', () => {
    render(<MultiStepSignup />);
    expect(screen.getByTestId('secondary-btn')).toBeDisabled();
  });

  it('renders step 1 with email, password, and confirm inputs', () => {
    render(<MultiStepSignup />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('At least 6 characters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
  });

  it('Back button goes to previous step', async () => {
    render(<MultiStepSignup />);
    await completeStep1AndNext();
    expect(screen.getByText(/Step 2 of 6/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('secondary-btn'));
    expect(screen.getByText(/Step 1 of 6/)).toBeInTheDocument();
  });

  it('completes signup and redirects to dashboard', async () => {
    render(<MultiStepSignup />);
    await completeStep1AndNext();
    completeStep2AndNext();
    completeStep3AndNext();
    completeStep4AndNext();
    completeStep5AndNext();
    await completeStep6AndSubmit();
    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockCreateUserAccount).toHaveBeenCalled();
    }, { timeout: 8000 });
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  }, 15000);

  it('passes invite token to createUserAccount when present in URL', async () => {
    routerQuery = { invite: 'invite-token-123' };
    render(<MultiStepSignup />);
    await completeStep1AndNext();
    completeStep2AndNext();
    completeStep3AndNext();
    completeStep4AndNext();
    completeStep5AndNext();
    await completeStep6AndSubmit();
    await waitFor(() => expect(mockCreateUserAccount).toHaveBeenCalled(), { timeout: 8000 });
    const call = mockCreateUserAccount.mock.calls[0];
    expect(call[3]).toBe('invite-token-123');
  }, 12000);

  it('shows submit error when createUserAccount fails and cleanup runs', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    mockCreateUserAccount.mockRejectedValueOnce(new Error('Profile creation failed'));
    render(<MultiStepSignup />);
    await completeStep1AndNext();
    completeStep2AndNext();
    completeStep3AndNext();
    completeStep4AndNext();
    completeStep5AndNext();
    await completeStep6AndSubmit();
    await waitFor(() => {
      expect(screen.getByText(/Account creation failed/)).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/delete-auth-user',
      expect.objectContaining({ method: 'POST', body: expect.any(String) })
    );
  }, 12000);

  it('shows rate limit message when signup throws rate limit error', async () => {
    mockSignup.mockRejectedValueOnce(new Error('Rate limit exceeded'));
    render(<MultiStepSignup />);
    await completeStep1AndNext();
    completeStep2AndNext();
    completeStep3AndNext();
    completeStep4AndNext();
    completeStep5AndNext();
    await completeStep6AndSubmit();
    await waitFor(() => {
      expect(screen.getByText(/rate limit|Rate limit/i)).toBeInTheDocument();
    });
  });

  it('shows already registered message when signup throws user already exists', async () => {
    mockSignup.mockRejectedValueOnce(new Error('User already exists'));
    render(<MultiStepSignup />);
    await completeStep1AndNext();
    completeStep2AndNext();
    completeStep3AndNext();
    completeStep4AndNext();
    completeStep5AndNext();
    await completeStep6AndSubmit();
    await waitFor(() => {
      expect(screen.getByText(/already registered.*sign in/i)).toBeInTheDocument();
    });
  });

  it('shows generic submit error when signup fails', async () => {
    mockSignup.mockRejectedValueOnce(new Error('Network error'));
    render(<MultiStepSignup />);
    await completeStep1AndNext();
    completeStep2AndNext();
    completeStep3AndNext();
    completeStep4AndNext();
    completeStep5AndNext();
    await completeStep6AndSubmit();
    await waitFor(() => {
      expect(screen.getByText(/Network error|Failed to create account/i)).toBeInTheDocument();
    });
  }, 12000);

  it('shows please wait when submitting again within 2 seconds', async () => {
    render(<MultiStepSignup />);
    await completeStep1AndNext();
    completeStep2AndNext();
    completeStep3AndNext();
    completeStep4AndNext();
    completeStep5AndNext();
    await completeStep6AndSubmit();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
    fireEvent.click(screen.getByTestId('primary-btn'));
    await waitFor(() => {
      expect(screen.getByText(/Please wait a moment/i)).toBeInTheDocument();
    });
  });
});
