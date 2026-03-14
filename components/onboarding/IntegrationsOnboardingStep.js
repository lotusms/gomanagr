'use client';

/**
 * Onboarding step: API / Integrations setup.
 * Renders the same integration cards as Settings → Integrations so org can connect Stripe, Twilio, Mailchimp, Resend.
 * Use inside an onboarding wizard; when organization exists, credentials are saved per-org (encrypted).
 * Optional title/description override the default Integrations heading when provided.
 */

import IntegrationsSettings from '@/components/settings/IntegrationsSettings';

export default function IntegrationsOnboardingStep({ title, description }) {
  return (
    <div className="space-y-6">
      {(title || description) && (
        <div>
          {title && <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{title}</h2>}
          {description && <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>}
        </div>
      )}
      <IntegrationsSettings />
    </div>
  );
}
