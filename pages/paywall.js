import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * Legacy route: org trial paywall is disabled — superadmin and developers are never gated by trial.
 * Direct visits redirect to the dashboard.
 */
function PaywallPageContent() {
  const router = useRouter();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.uid) {
      router.replace('/dashboard');
    }
  }, [currentUser?.uid, router]);

  return (
    <>
      <Head>
        <title>GoManagr</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" aria-hidden />
      </div>
    </>
  );
}

export default function PaywallPage() {
  return (
    <ProtectedRoute>
      <PaywallPageContent />
    </ProtectedRoute>
  );
}
