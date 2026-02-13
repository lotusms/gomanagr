/**
 * Hook to require authentication for a page
 * Redirects to login page if not authenticated
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/client/lib/AuthContext';

export function useRequireAuth() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      // Use replace instead of push to prevent back button navigation
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  return { currentUser, loading };
}
