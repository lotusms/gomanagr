/**
 * Unit tests for AuthForm.js – login/signup form, validation, auth calls, error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthForm from '@/components/AuthForm';

jest.mock('next/router', () => ({
  useRouter: () => ({}),
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

const mockLogin = jest.fn();
const mockSignup = jest.fn();
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, signup: mockSignup }),
}));

// Mock PasswordField to call validate prop so validatePasswordMatch (lines 62-65) is covered.
// Use direct path for InputField to avoid circular deps from barrel.
jest.mock('@/components/ui', () => {
  const React = require('react');
  const InputField = require('@/components/ui/InputField').default;
  return {
    InputField,
    PasswordField: function MockPasswordField(props) {
      const errorFromValidate = props.validate ? props.validate(props.value) : null;
      const error = props.error || errorFromValidate;
      return (
        <div>
          <label htmlFor={props.id}>{props.label}</label>
          <input
            id={props.id}
            type="password"
            value={props.value}
            onChange={props.onChange}
            placeholder={props.placeholder}
            required={props.required}
            aria-invalid={!!error}
          />
          {error && <p role="alert">{error}</p>}
        </div>
      );
    },
  };
});

describe('AuthForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login mode', () => {
    it('renders email, password fields and Sign In button', () => {
      render(<AuthForm mode="login" />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('renders Forgot password and Sign up links', () => {
      render(<AuthForm mode="login" />);
      expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password');
      expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/signup');
    });

    it('calls login with email and password on submit', async () => {
      mockLogin.mockResolvedValue(undefined);
      render(<AuthForm mode="login" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'password123'));
    });

    it('sets passwordError when password is shorter than 6 characters', async () => {
      render(<AuthForm mode="login" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: '12345' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('sets emailError when login throws error containing "email"', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid email address'));
      render(<AuthForm mode="login" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    });

    it('sets emailError when login throws error containing "user"', async () => {
      mockLogin.mockRejectedValue(new Error('User not found'));
      render(<AuthForm mode="login" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'x@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      expect(await screen.findByText('User not found')).toBeInTheDocument();
    });

    it('sets passwordError when login throws error containing "password"', async () => {
      mockLogin.mockRejectedValue(new Error('Wrong password'));
      render(<AuthForm mode="login" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      expect(await screen.findByText('Wrong password')).toBeInTheDocument();
    });

    it('sets generalError when login throws other error', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'));
      render(<AuthForm mode="login" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      expect(await screen.findByText('Network error')).toBeInTheDocument();
    });

    it('uses generic message when error has no message', async () => {
      mockLogin.mockRejectedValue(new Error());
      render(<AuthForm mode="login" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      expect(await screen.findByText('Failed to authenticate')).toBeInTheDocument();
    });

    it('clears emailError when email input changes', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid email'));
      render(<AuthForm mode="login" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'x@x.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      await screen.findByText('Invalid email');
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'y@y.com' } });
      expect(screen.queryByText('Invalid email')).not.toBeInTheDocument();
    });

    it('clears passwordError when password input changes', async () => {
      mockLogin.mockRejectedValue(new Error('Wrong password'));
      render(<AuthForm mode="login" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      await screen.findByText('Wrong password');
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'newpass123' } });
      expect(screen.queryByText('Wrong password')).not.toBeInTheDocument();
    });

    it('shows Processing and disables button while submitting', async () => {
      let resolveLogin;
      mockLogin.mockImplementation(() => new Promise((r) => { resolveLogin = r; }));
      render(<AuthForm mode="login" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      const submitBtn = screen.getByRole('button', { name: 'Sign In' });
      fireEvent.click(submitBtn);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      const submitButton = screen.getByRole('button', { name: /Processing|Sign In/ });
      expect(submitButton).toBeDisabled();
      resolveLogin();
      await waitFor(() => expect(screen.queryByText('Processing...')).not.toBeInTheDocument());
    });
  });

  describe('signup mode', () => {
    it('renders confirm password field and Create Account button', () => {
      render(<AuthForm mode="signup" />);
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/confirm your password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    });

    it('renders Sign in link', () => {
      render(<AuthForm mode="signup" />);
      expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    });

    it('sets confirmPasswordError when password and confirm do not match', async () => {
      render(<AuthForm mode="signup" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), { target: { value: 'different' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
      expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('calls signup with email and password when passwords match', async () => {
      mockSignup.mockResolvedValue(undefined);
      render(<AuthForm mode="signup" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
      await waitFor(() => expect(mockSignup).toHaveBeenCalledWith('new@test.com', 'password123'));
    });

    it('clears confirmPasswordError when confirm password input changes', async () => {
      render(<AuthForm mode="signup" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
      fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), { target: { value: 'other' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
      expect(await screen.findByText('Passwords do not match', {}, { timeout: 3000 })).toBeInTheDocument();
      fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), { target: { value: 'password123' } });
      await waitFor(() => expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument());
    });

    it('shows inline validation when confirm password does not match (validatePasswordMatch)', () => {
      render(<AuthForm mode="signup" />);
      fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'secret123' } });
      fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), { target: { value: 'different' } });
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  describe('default props', () => {
    it('defaults to login mode', () => {
      render(<AuthForm />);
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument();
    });
  });
});
