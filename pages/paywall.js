import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrganization } from '@/services/organizationService';
import { getOrgTrialStatus } from '@/lib/trialUtils';
import Paywall from '@/components/subscriptions/Paywall';
import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * Paywall page: shown when org superadmin/owner's trial has expired.
 * Team members (admin, developer, member) are grandfathered and get redirected to dashboard.
 */
function PaywallPageContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    getUserOrganization(currentUser.uid)
      .then((org) => setOrganization(org || null))
      .catch(() => setOrganization(null))
      .finally(() => setLoading(false));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!organization || loading) return;
    const role = organization?.membership?.role;
    const trialStatus = getOrgTrialStatus(organization);

    // Team members are grandfathered — send them to dashboard
    if (role !== 'superadmin') {
      router.replace('/dashboard');
      return;
    }
    // Superadmin with active trial — no need to be on paywall
    if (!trialStatus.expired) {
      router.replace('/dashboard');
    }
  }, [organization, loading, router]);

  const handleSubscribe = () => {
    router.push('/dashboard/subscriptions');
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Trial expired - GoManagr</title>
        </Head>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" aria-hidden />
        </div>
      </>
    );
  }

  const role = organization?.membership?.role;
  const trialStatus = getOrgTrialStatus(organization);
  const showPaywall = role === 'superadmin' && trialStatus.expired;

  if (!showPaywall) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" aria-hidden />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Trial expired - GoManagr</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Paywall
        userAccount={{
          trial: organization?.trial ?? true,
          trialEndsAt: organization?.trial_ends_at ?? organization?.trialEndsAt ?? null,
        }}
        onSubscribe={handleSubscribe}
      />
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
