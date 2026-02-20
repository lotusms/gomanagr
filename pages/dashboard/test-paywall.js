import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Paywall from '@/components/subscriptions/Paywall';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { useState, useEffect } from 'react';

/**
 * Test page to view the Paywall component
 * Access at: /dashboard/test-paywall
 */
export default function TestPaywallPage() {
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.uid) {
      getUserAccount(currentUser.uid)
        .then((data) => {
          setUserAccount(data || null);
        })
        .catch(() => setUserAccount(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  if (loading) {
    return (
      <>
        <Head>
          <title>Test Paywall - GoManagr</title>
        </Head>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Test Paywall - GoManagr</title>
      </Head>
      <Paywall userAccount={userAccount} />
    </>
  );
}
