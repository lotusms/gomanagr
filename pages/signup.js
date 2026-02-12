import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/client/lib/AuthContext';
import PublicLayout from '@/components/layouts/PublicLayout';
import MultiStepSignup from '@/components/signup/MultiStepSignup';

export default function SignupPage() {
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
    <PublicLayout title="Sign Up - GoManagr">
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <MultiStepSignup />
      </div>
    </PublicLayout>
  );
}
