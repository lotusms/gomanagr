import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { HiLockClosed, HiCheck } from 'react-icons/hi';
import { useAuth } from '@/lib/AuthContext';
import SubscriptionPlansGrid from '@/components/subscriptions/SubscriptionPlansGrid';

/**
 * Paywall component shown when trial expires
 * Blocks access to the application until subscription is activated
 */
export default function Paywall({ userAccount, onSubscribe }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (userAccount?.trialEndsAt) {
      const trialEnd = new Date(userAccount.trialEndsAt);
      const now = new Date();
      const diffTime = trialEnd - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        setTrialExpired(true);
        setDaysRemaining(0);
      } else {
        setTrialExpired(false);
        setDaysRemaining(diffDays);
      }
    } else if (userAccount?.trial === true) {
      setTrialExpired(true);
      setDaysRemaining(0);
    }
  }, [userAccount]);

  const handleSubscribe = (planId, period) => {
    if (onSubscribe) {
      onSubscribe();
    } else {
      router.push('/dashboard/subscriptions');
    }
  };

  const formatPrice = (price) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
    return formatted.replace(/\.00$/, '');
  };

  const handleSignInDifferentAccount = async () => {
    setSigningOut(true);
    try {
      await logout();
      await router.replace('/login');
    } finally {
      setSigningOut(false);
    }
  };

  const features = [
    'Unlimited clients and projects',
    'Unlimited team members',
    'Advanced reporting and analytics',
    'Priority support',
    'Custom integrations',
    'Data export and backup',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 pb-12">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <HiLockClosed className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {trialExpired ? 'Your Trial Has Expired' : `Trial Expires in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}`}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {trialExpired
              ? 'Subscribe to continue using GoManagr and unlock all features'
              : 'Subscribe now to ensure uninterrupted access to all features'}
          </p>
          {trialExpired && (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Need to sign in with a different email?{' '}
              <button
                type="button"
                onClick={handleSignInDifferentAccount}
                disabled={signingOut}
                className="font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
              >
                {signingOut ? 'Signing out…' : 'Sign out and return to login'}
              </button>
            </p>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <HiCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">{feature}</span>
            </div>
          ))}
        </div>

        {/* Pricing Plans */}
        <SubscriptionPlansGrid
          onSubscribe={handleSubscribe}
          formatPrice={formatPrice}
        />

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            All plans include a 30-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
