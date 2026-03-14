'use client';

import { useState } from 'react';
import { HiSpeakerphone, HiCreditCard } from 'react-icons/hi';
import MarketingProviderSettings from './MarketingProviderSettings';
import StripeSettings from './StripeSettings';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';

export default function APISettings() {
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [stripeOpen, setStripeOpen] = useState(false);

  const openMarketing = () => {
    setStripeOpen(false);
    setMarketingOpen(true);
  };
  const openStripe = () => {
    setMarketingOpen(false);
    setStripeOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">API</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          API keys and integrations for payments, marketing, and other services.
        </p>
      </div>

      <CollapsibleSection
        title="Marketing providers"
        isOpen={marketingOpen}
        onToggle={() => (marketingOpen ? setMarketingOpen(false) : openMarketing())}
        icon={<HiSpeakerphone className="w-5 h-5" aria-hidden />}
      >
        <MarketingProviderSettings />
      </CollapsibleSection>

      <CollapsibleSection
        title="Stripe"
        isOpen={stripeOpen}
        onToggle={() => (stripeOpen ? setStripeOpen(false) : openStripe())}
        icon={<HiCreditCard className="w-5 h-5" aria-hidden />}
      >
        <StripeSettings />
      </CollapsibleSection>
    </div>
  );
}
