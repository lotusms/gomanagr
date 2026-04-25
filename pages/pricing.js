import { useRouter } from 'next/router';
import PublicLayout from '@/components/layouts/PublicLayout';
import SubscriptionPlansGrid from '@/components/subscriptions/SubscriptionPlansGrid';
import { HiCheck, HiLockClosed } from 'react-icons/hi';

const TRIAL_VALUE_POINTS = [
  'Unlimited clients and projects',
  'Unlimited team members',
  'Advanced reporting and analytics',
  'Priority support',
  'Custom integrations',
  'Data export and backup',
];

export default function PricingPage() {
  const router = useRouter();

  const formatPrice = (price) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
    return formatted.replace(/\.00$/, '');
  };

  const handleSubscribe = (planId) => {
    if (planId === 'enterprise') {
      if (typeof window !== 'undefined') {
        window.location.href = 'mailto:support@gomanagr.com?subject=GoManagr%20Enterprise%20Pricing';
      }
      return;
    }
    router.push('/signup');
  };

  return (
    <PublicLayout title="Pricing | GoManagr">
      <section className="pt-20 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100/90 mb-4">
            <HiLockClosed className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white">Simple Pricing That Scales With You</h1>
          <p className="mt-4 text-lg text-primary-100 max-w-3xl mx-auto">
            Start with a free trial, then choose the plan that fits your team. This pricing structure matches the same
            subscription experience users see when a trial expires.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {TRIAL_VALUE_POINTS.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-3 p-4 rounded-xl border border-white/20 bg-white/95 dark:bg-gray-900/90"
            >
              <HiCheck className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl p-6 md:p-8">
          <SubscriptionPlansGrid
            onSubscribe={handleSubscribe}
            formatPrice={formatPrice}
            title="Choose your plan"
          />
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            All plans include a 30-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
