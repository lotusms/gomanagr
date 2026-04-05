import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
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
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (currentUser?.uid && !loading) {
      Promise.all([
        getUserAccount(currentUser.uid).catch(() => null),
        getUserOrganization(currentUser.uid).catch(() => null),
      ])
        .then(([account, org]) => {
          setUserAccount(account);
          let expired = false;
          if (org) {
            expired = false;
          } else {
            const trialStatus = getTrialStatus(account);
            expired = trialStatus.expired && account?.trial === true;
          }
          setTrialExpired(expired);
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

  if (trialExpired) {
    return <Paywall userAccount={userAccount} />;
  }

  return children;
}
