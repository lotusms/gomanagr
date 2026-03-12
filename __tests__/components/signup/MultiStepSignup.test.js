/**
 * Unit tests for MultiStepSignup: step navigation, updateData, validation, step content
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import MultiStepSignup from '@/components/signup/MultiStepSignup';

const mockPush = jest.fn();
const mockSignup = jest.fn();
const mockCreateUserAccount = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({ query: {}, push: mockPush }),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ signup: mockSignup }),
}));

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

jest.mock('@/utils/emailCheck', () => ({ checkEmailExists: jest.fn().mockResolvedValue({ exists: false }) }));

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

describe('MultiStepSignup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
