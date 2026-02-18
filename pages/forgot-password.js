import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import PublicLayout from '@/components/layouts/PublicLayout';
import Logo from '@/components/Logo';
import InputField from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/buttons';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setSuccess(false);

    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setEmailError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout title="Forgot Password - GoManagr">
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
        <div className="relative z-10 w-full max-w-md">
          {/* Logo/Brand Section */}
          <Logo variant="stacked" wordmarkLight />

          {/* Auth Card */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 relative overflow-hidden group hover:border-white/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              <div className="relative z-10">
                <div className="mb-8 text-center">                 
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Reset Password
                  </h2>
                  <p className="text-primary-200/70 text-sm">
                    {success 
                      ? 'Check your email for reset instructions'
                      : 'Enter your email to receive a password reset link'}
                  </p>
                </div>

                {success ? (
                  <div className="space-y-4">
                    <div className="px-4 py-3 rounded-lg bg-green-900/50 border border-green-500/50 text-green-200">
                      <div className="flex items-center gap-2">
                        <span>✓</span>
                        <span>Password reset email sent! Check your inbox.</span>
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <Link
                        href="/login"
                        className="text-primary-200/80 hover:text-white font-medium text-sm transition-all duration-200 hover:underline underline-offset-4 block"
                      >
                        Back to Sign In
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
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

                    {emailError && (
                      <div className="px-4 py-3 rounded-lg bg-red-900/50 border border-red-500/50 text-red-200">
                        {emailError}
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
                            Sending...
                          </span>
                        ) : (
                          'Send Reset Link'
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

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-primary-200/80 hover:text-white font-medium text-sm transition-all duration-200 hover:underline underline-offset-4"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
