import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import PublicLayout from '@/components/layouts/PublicLayout';
import Logo from '@/components/Logo';
import PasswordField from '@/components/ui/PasswordField';
import { PrimaryButton } from '@/components/ui/buttons';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const { resetPasswordWithToken, currentUser } = useAuth();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    const hashParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.hash?.substring(1) || '') : null;
    const hasRecoveryInUrl = hashParams?.get('type') === 'recovery' && hashParams?.get('access_token');

    // If the URL has a recovery token, we must NOT trust the current session — it might be
    // another user (e.g. admin) in the same browser. Only set validToken after Supabase
    // has processed the recovery hash and emitted PASSWORD_RECOVERY (session = user who requested reset).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidToken(true);
        setCheckingToken(false);
        return;
      }
      if (hasRecoveryInUrl) {
        // URL has recovery token; don't trust any other event until we get PASSWORD_RECOVERY
        return;
      }
      if (session && event === 'SIGNED_IN') {
        setValidToken(true);
        setCheckingToken(false);
      }
    });

    if (hasRecoveryInUrl) {
      // Clear any existing session (e.g. admin in same browser) so the recovery token
      // can establish the correct user's session. Then Supabase will process the hash
      // and emit PASSWORD_RECOVERY with the team member's session.
      supabase.auth.signOut().finally(() => {
        // Hash is processed by Supabase client after load; wait for PASSWORD_RECOVERY
      });
      const fallback = setTimeout(() => {
        setValidToken(false);
        setCheckingToken(false);
      }, 10000);
      return () => {
        subscription.unsubscribe();
        clearTimeout(fallback);
      };
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidToken(true);
      setCheckingToken(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Only use currentUser to set validToken when there is NO recovery token in the URL.
    // When there is a recovery token, the current session might still be the wrong user (admin);
    // we must wait for PASSWORD_RECOVERY so the session is the person resetting their password.
    if (typeof window === 'undefined') return;
    const hashParams = new URLSearchParams(window.location.hash?.substring(1) || '');
    if (hashParams.get('type') === 'recovery') return;
    if (currentUser) {
      setValidToken(true);
      setCheckingToken(false);
    }
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');
    setSuccess(false);

    // Validation
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await resetPasswordWithToken(newPassword);
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      const errorMessage = err.message || 'Failed to reset password';
      if (errorMessage.toLowerCase().includes('password')) {
        setPasswordError(errorMessage);
      } else {
        setGeneralError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <PublicLayout title="Reset Password - GoManagr">
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
          <div className="relative z-10 w-full max-w-md">
            <Logo variant="stacked" wordmarkLight />
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 mt-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                <p className="text-primary-200/70">Verifying reset link...</p>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!validToken) {
    return (
      <PublicLayout title="Reset Password - GoManagr">
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
          <div className="relative z-10 w-full max-w-md">
            <Logo variant="stacked" wordmarkLight />
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 mt-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Invalid or Expired Link</h2>
                <p className="text-primary-200/70 mb-6">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
                <Link
                  href="/forgot-password"
                  className="text-primary-200/80 hover:text-white font-medium text-sm transition-all duration-200 hover:underline underline-offset-4"
                >
                  Request New Reset Link
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="Reset Password - GoManagr">
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
        <div className="relative z-10 w-full max-w-md">
          <Logo variant="stacked" wordmarkLight />

          <div className="relative">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 relative overflow-hidden group hover:border-white/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              <div className="relative z-10">
                <div className="mb-8 text-center">                 
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {success ? 'Password Reset!' : 'Set New Password'}
                  </h2>
                  <p className="text-primary-200/70 text-sm">
                    {success 
                      ? 'Your password has been updated successfully'
                      : 'Enter your new password below'}
                  </p>
                </div>

                {success ? (
                  <div className="space-y-4">
                    <div className="px-4 py-3 rounded-lg bg-green-900/50 border border-green-500/50 text-green-200">
                      <div className="flex items-center gap-2">
                        <span>✓</span>
                        <span>Password updated! Redirecting to login...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <PasswordField
                      id="newPassword"
                      label="New Password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                      }}
                      placeholder="Enter new password"
                      required
                      error={passwordError}
                    />

                    <PasswordField
                      id="confirmPassword"
                      label="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError('');
                      }}
                      placeholder="Confirm new password"
                      required
                      error={confirmPasswordError}
                      validate={(value) => {
                        if (value && value !== newPassword) {
                          return 'Passwords do not match';
                        }
                        return null;
                      }}
                    />

                    {(generalError || passwordError || confirmPasswordError) && (
                      <div className="px-4 py-3 rounded-lg bg-red-900/50 border border-red-500/50 text-red-200">
                        {generalError || passwordError || confirmPasswordError}
                      </div>
                    )}

                    <div className="pt-2">
                      <PrimaryButton
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 text-base font-semibold"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                          </span>
                        ) : (
                          'Reset Password'
                        )}
                      </PrimaryButton>
                    </div>
                  </form>
                )}
              </div>

              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-br-full"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-white/10 to-transparent rounded-tl-full"></div>
            </div>
          </div>

          {!success && (
            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="text-primary-200/80 hover:text-white font-medium text-sm transition-all duration-200 hover:underline underline-offset-4"
              >
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
