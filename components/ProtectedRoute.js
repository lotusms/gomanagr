import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getTrialStatus } from '@/lib/trialUtils';
import Paywall from '@/components/subscriptions/Paywall';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [userAccount, setUserAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) {
      // Use replace instead of push to prevent back button navigation
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  // Check trial status when user is loaded
  useEffect(() => {
    if (currentUser?.uid && !loading) {
      getUserAccount(currentUser.uid)
        .then((data) => {
          setUserAccount(data || null);
          
          // Check trial status using utility function
          const trialStatus = getTrialStatus(data);
          setTrialExpired(trialStatus.expired && data?.trial === true);
        })
        .catch(() => {
          setUserAccount(null);
          setTrialExpired(false);
        })
        .finally(() => setAccountLoading(false));
    } else if (!currentUser && !loading) {
      setAccountLoading(false);
    }
  }, [currentUser, loading]);

  if (loading || accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // Show paywall if trial has expired
  if (trialExpired && userAccount?.trial === true) {
    return <Paywall userAccount={userAccount} />;
  }

  return children;
}
