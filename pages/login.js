import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/client/lib/AuthContext';
import PublicLayout from '@/components/layouts/PublicLayout';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-white">Loading...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (currentUser) {
    return null;
  }

  return (
    <PublicLayout title="Sign In - GoManagr">
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-purple-200">
                {mode === 'login'
                  ? 'Welcome back! Sign in to continue'
                  : 'Create your account to get started'}
              </p>
            </div>

            <AuthForm
              mode={mode}
              darkMode={true}
              onToggleMode={() => setMode(mode === 'login' ? 'signup' : 'login')}
            />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
