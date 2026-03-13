'use client';

import ProviderStatusBadge from './ProviderStatusBadge';
import ProviderCapabilityBadges from './ProviderCapabilityBadges';
import { PROVIDER_DISPLAY_NAMES } from '@/lib/marketing/providerRegistry';

/**
 * Compact card showing which provider will be used for sending and its status.
 * @param {{
 *   providerType: string,
 *   status: string | null,
 *   capabilities: { email: boolean, sms: boolean },
 *   warning?: string,
 * }} props
 */
export default function ProviderInfoCard({ providerType, status, capabilities, warning }) {
  const displayName = PROVIDER_DISPLAY_NAMES[providerType] || providerType;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Sending via</h3>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-gray-900 dark:text-white font-medium">{displayName}</span>
        {status && <ProviderStatusBadge status={status} />}
        <ProviderCapabilityBadges capabilities={capabilities} />
      </div>
      {warning && (
        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">{warning}</p>
      )}
    </div>
  );
}
