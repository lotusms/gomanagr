import { PrimaryButton } from '@/components/ui/buttons';
import { HiCheck } from 'react-icons/hi';

/**
 * Reusable subscription plan card component
 * @param {Object} plan - The subscription plan object
 * @param {string} billingPeriod - 'Monthly' or 'Annually'
 * @param {Function} onSubscribe - Callback function when subscribe button is clicked
 * @param {Function} formatPrice - Function to format price values
 */
export default function SubscriptionPlanCard({ plan, billingPeriod, onSubscribe, formatPrice }) {
  const handleButtonClick = () => {
    if (onSubscribe) {
      onSubscribe(plan.id, billingPeriod.toLowerCase());
    }
  };

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 p-6 flex flex-col h-full ${
        plan.popular
          ? 'border-primary-500 dark:border-primary-400 scale-105'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {plan.name}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
          {plan.description}
        </p>
        <div className="flex flex-col items-center min-h-[140px]">
          {plan.customPricing ? (
            <>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  Let's Talk
                </span>
              </div>
              {/* Spacer to match Monthly layout - one text line with mb-2 */}
              {billingPeriod === 'Monthly' ? (
                <p className="text-xs mt-1 mb-2 invisible">placeholder</p>
              ) : (
                <>
                  {/* Spacer to match Annually layout - two text lines */}
                  <p className="text-xs mt-1 invisible">placeholder</p>
                  <p className="text-xs mt-1 mb-2 invisible">placeholder</p>
                </>
              )}
            </>
          ) : billingPeriod === 'Monthly' ? (
            <>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(plan.monthlyPrice)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 mb-2">
                {formatPrice(plan.monthlyPrice * 12)}/year, paid monthly
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(plan.yearlyPricePerMonth)}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {formatPrice(plan.yearlyPrice)}/a year
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 mb-2 font-medium">
                Save {formatPrice(plan.monthlyPrice * 12 - plan.yearlyPrice)} every year!
              </p>
            </>
          )}
          <PrimaryButton
            onClick={handleButtonClick}
            className={`w-full mt-auto mb-2 ${
              plan.popular
                ? 'bg-primary-600 hover:bg-primary-700'
                : plan.customPricing
                  ? 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600'
                  : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {plan.customPricing ? 'Contact Sales' : plan.popular ? 'Get Started' : 'Choose Plan'}
          </PrimaryButton>
        </div>
      </div>
      <ul className="space-y-3 flex-1">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <HiCheck className="w-5 h-5 text-secondary-500 flex-shrink-0 mr-2 mt-0.5" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
