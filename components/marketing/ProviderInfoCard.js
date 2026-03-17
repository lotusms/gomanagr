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
    <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-primary-50/50 dark:from-primary-900/30 dark:to-primary-950/20 border-b border-primary-100/50 dark:border-primary-800/30">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400">Sending via</h3>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-900 dark:text-white font-semibold">{displayName}</span>
          {status && <ProviderStatusBadge status={status} />}
          <ProviderCapabilityBadges capabilities={capabilities} />
        </div>
        {warning && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">{warning}</p>
        )}
      </div>
    </div>
  );
}
