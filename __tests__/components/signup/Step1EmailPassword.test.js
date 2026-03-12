/**
 * Unit tests for Step1EmailPassword: render, email/password/confirm, updateData, trial checkbox, email check
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Step1EmailPassword from '@/components/signup/Step1EmailPassword';

jest.mock('next/link', () => ({ children, href }) => <a href={href}>{children}</a>);

const mockCheckEmailExists = jest.fn();
jest.mock('@/utils/emailCheck', () => ({
  checkEmailExists: (...args) => mockCheckEmailExists(...args),
}));

jest.mock('@/components/ui', () => ({
  InputField: ({ id, label, value, onChange, onBlur, error, checking }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-label={label} value={value} onChange={onChange} onBlur={onBlur} data-error={error} data-checking={checking} />
    </div>
  ),
  PasswordField: ({ id, label, value, onChange, placeholder, error }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="password" aria-label={label} value={value} onChange={onChange} placeholder={placeholder} data-error={error} />
    </div>
  ),
  Checkbox: ({ id, checked, onCheckedChange, children }) => (
    <label>
      <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} data-testid={id} />
      {children}
    </label>
  ),
}));

describe('Step1EmailPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckEmailExists.mockResolvedValue({ exists: false });
  });

  it('renders heading, email, password, confirm password, trial checkbox', () => {
    const updateData = jest.fn();
    render(<Step1EmailPassword data={{}} updateData={updateData} errors={{}} />);
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByTestId('trial')).toBeInTheDocument();
  });

  it('calls updateData when email, password, confirm password change', async () => {
    const updateData = jest.fn();
    render(<Step1EmailPassword data={{}} updateData={updateData} errors={{}} />);
    await userEvent.type(screen.getByLabelText('Email Address'), 'a@b.com');
    expect(updateData).toHaveBeenCalledWith({ email: 'a@b.com' });
    await userEvent.type(screen.getByLabelText('Password'), 'secret12');
    expect(updateData).toHaveBeenCalledWith({ password: 'secret12' });
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'secret12');
    expect(updateData).toHaveBeenCalledWith({ confirmPassword: 'secret12' });
  });

  it('calls updateData with trial when checkbox is toggled', async () => {
    const updateData = jest.fn();
    render(<Step1EmailPassword data={{ trial: true }} updateData={updateData} errors={{}} />);
    await userEvent.click(screen.getByTestId('trial'));
    expect(updateData).toHaveBeenCalledWith({ trial: false });
  });

  it('shows email exists message when checkEmailExists returns exists true', async () => {
    mockCheckEmailExists.mockResolvedValue({ exists: true });
    render(<Step1EmailPassword data={{ email: 'taken@example.com' }} updateData={jest.fn()} errors={{}} />);
    await waitFor(() => expect(screen.getByText(/This user already exists/)).toBeInTheDocument(), { timeout: 3000 });
  });

  it('calls onEmailCheck and onEmailVerified when email is checked', async () => {
    const onEmailCheck = jest.fn();
    const onEmailVerified = jest.fn();
    mockCheckEmailExists.mockResolvedValue({ exists: false });
    render(
      <Step1EmailPassword
        data={{ email: 'new@example.com' }}
        updateData={jest.fn()}
        errors={{}}
        onEmailCheck={onEmailCheck}
        onEmailVerified={onEmailVerified}
      />
    );
    await waitFor(() => expect(mockCheckEmailExists).toHaveBeenCalled(), { timeout: 2000 });
    await waitFor(() => {
      expect(onEmailCheck).toHaveBeenCalled();
      expect(onEmailCheck.mock.calls[0][0]).toBe(false);
    }, { timeout: 2000 });
  });

  it('displays errors from errors prop', () => {
    render(<Step1EmailPassword data={{}} updateData={jest.fn()} errors={{ email: 'Invalid', password: 'Too short' }} />);
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('data-error', 'Invalid');
    expect(screen.getByLabelText('Password')).toHaveAttribute('data-error', 'Too short');
  });
});
