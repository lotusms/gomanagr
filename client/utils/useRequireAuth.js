/**
 * Hook to require authentication for a page
 * Redirects to home page if not authenticated
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/client/lib/AuthContext';

export function useRequireAuth() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/');
    }
  }, [currentUser, loading, router]);

  return { currentUser, loading };
}
