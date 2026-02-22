import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getTrialStatus } from '@/lib/trialUtils';
import { PageHeader } from '@/components/ui';
import { HiLockClosed } from 'react-icons/hi';
import SubscriptionPlansGrid from '@/components/subscriptions/SubscriptionPlansGrid';

function SubscriptionsContent() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [userAccount, setUserAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trialStatus, setTrialStatus] = useState({
    isActive: false,
    daysRemaining: 0,
    expired: false,
    trialEndsAt: null,
  });

  useEffect(() => {
    if (currentUser?.uid) {
      getUserAccount(currentUser.uid)
        .then((data) => {
          setUserAccount(data || null);
          
          // Calculate trial status using utility function
          const status = getTrialStatus(data);
          setTrialStatus({
            isActive: data?.trial === true && !status.expired,
            daysRemaining: status.daysRemaining,
            expired: status.expired,
            trialEndsAt: status.trialEndsAt?.toISOString() || null,
          });
        })
        .catch(() => setUserAccount(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  const handleSubscribe = (planId, period) => {
    // TODO: Integrate with payment provider (Stripe, etc.)
    alert(`Subscription to ${planId} plan (${period}) - Payment integration coming soon!`);
    // After successful payment:
    // 1. Update userAccount.trial = false
    // 2. Set subscription status
    // 3. Redirect to dashboard
  };

  const formatPrice = (price) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
    // Remove .00 for whole numbers
    return formatted.replace(/\.00$/, '');
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Subscriptions - GoManagr</title>
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
        <title>Subscriptions - GoManagr</title>
        <meta name="description" content="Manage your subscription" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Subscriptions"
          description="Manage your subscription and billing"
        />

        {/* Trial Status Card */}
        {trialStatus.isActive && (
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-800 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Free Trial Active
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-1">
                  {trialStatus.daysRemaining} day{trialStatus.daysRemaining !== 1 ? 's' : ''} remaining - ends on {new Date(trialStatus.trialEndsAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                  Active
                </span>
              </div>
            </div>
          </div>
        )}

        {trialStatus.expired && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start">
              <HiLockClosed className="w-6 h-6 text-red-600 dark:text-red-400 mr-3 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">
                  Trial Expired
                </h3>
                <p className="text-red-700 dark:text-red-400 mb-4">
                  Your free trial has ended. Subscribe to continue using GoManagr.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Subscription (if any) */}
        {!trialStatus.isActive && !trialStatus.expired && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Current Subscription
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You have an active subscription. Manage your plan below.
            </p>
          </div>
        )}

        {/* Pricing Plans */}
        <SubscriptionPlansGrid
          onSubscribe={handleSubscribe}
          formatPrice={formatPrice}
        />

        {/* Additional Info */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                Can I change plans later?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                What happens to my data if I cancel?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your data will be retained for 30 days after cancellation. You can export your data at any time.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                Do you offer refunds?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Yes, we offer a 30-day money-back guarantee on all plans.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SubscriptionsPage() {
  return (
    <SubscriptionsContent />
  );
}
