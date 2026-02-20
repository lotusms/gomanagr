import { useState } from 'react';
import { ChipsSingle } from '@/components/ui';
import { subscriptionPlans } from '@/data/subscriptionPlans';
import SubscriptionPlanCard from './SubscriptionPlanCard';

/**
 * Shared component for displaying subscription plans with billing period selector
 * @param {Function} onSubscribe - Callback function when subscribe button is clicked
 * @param {Function} formatPrice - Function to format price values
 * @param {string} title - Optional title to display above plans (default: "Find the plan for you")
 */
export default function SubscriptionPlansGrid({ 
  onSubscribe, 
  formatPrice, 
  title = "Find the plan for you"
}) {
  const [billingPeriod, setBillingPeriod] = useState('Monthly');

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h3>
        
        {/* Billing Period Chips */}
        <div className="flex items-end mb-2 gap-x-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pay: </p>
          <ChipsSingle
            id="billing-period"
            options={['Monthly', 'Annually']}
            value={billingPeriod}
            onValueChange={(value) => setBillingPeriod(value)}
            variant="light"
            mini={true}
            layout="grouped"
          />              
        </div>
      </div>

      {billingPeriod === 'Annually' 
        ? (
            <div className="flex flex-col items-end mb-2">
              <p className="text-sm text-secondary-600 dark:text-secondary-400 font-medium mt-2">
                Save 15% with annual billing
              </p>
            </div>
          )
        : (
            <div className="h-8"/>
          )
      }

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {subscriptionPlans.map((plan) => (
          <SubscriptionPlanCard
            key={plan.id}
            plan={plan}
            billingPeriod={billingPeriod}
            onSubscribe={onSubscribe}
            formatPrice={formatPrice}
          />
        ))}
      </div>
    </div>
  );
}
