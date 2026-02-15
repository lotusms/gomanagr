import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { InputField, PasswordField } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';

export default function AuthForm({ mode = 'login', darkMode = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    // Validation
    if (mode === 'signup' && password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to authenticate';
      
      // Check if error is email-related
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('user')) {
        setEmailError(errorMessage);
      } else if (errorMessage.toLowerCase().includes('password')) {
        setPasswordError(errorMessage);
      } else {
        setGeneralError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Validate password match for signup
  const validatePasswordMatch = (value) => {
    if (mode === 'signup' && value && value !== password) {
      return 'Passwords do not match';
    }
    return null;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-5">
          <InputField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            placeholder="Enter your email"
            required
            error={emailError}
          />

          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            placeholder="Enter your password"
            required
            error={passwordError}
          />

          {mode === 'signup' && (
            <PasswordField
              id="confirmPassword"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (confirmPasswordError) setConfirmPasswordError('');
              }}
              placeholder="Confirm your password"
              required
              error={confirmPasswordError}
              validate={validatePasswordMatch}
            />
          )}
        </div>

        {generalError && (
          <div className="px-4 py-3 rounded-lg bg-red-900/50 border border-red-500/50 text-red-200 animate-shake">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{generalError}</span>
            </div>
          </div>
        )}

        <div className="pt-2">
          <PrimaryButton
            type="submit"
            disabled={loading}
            className="w-full py-3 text-base font-semibold transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </PrimaryButton>
        </div>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-transparent text-primary-200/60">or</span>
        </div>
      </div>

      {/* Link to other auth page */}
      <div className="text-center">
        <Link
          href={mode === 'login' ? '/signup' : '/login'}
          className="text-primary-200/80 hover:text-white font-medium text-sm transition-all duration-200 hover:underline underline-offset-4"
        >
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <span className="text-white font-semibold">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </span>
        </Link>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
