import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';

/**
 * Custom 404: redirect logged-in users to dashboard, others to home.
 */
export default function Custom404() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (currentUser) {
      router.replace('/dashboard');
    } else {
      router.replace('/');
    }
  }, [loading, currentUser, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <p className="text-gray-500 dark:text-gray-400">Redirecting...</p>
    </div>
  );
}
