'use client';

/**
 * Small badges for email / SMS capabilities.
 */
export default function ProviderCapabilityBadges({ capabilities }) {
  if (!capabilities) return null;
  const { email, sms } = capabilities;
  return (
    <span className="inline-flex items-center gap-1.5">
      {email && (
        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
          Email
        </span>
      )}
      {sms && (
        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300">
          SMS
        </span>
      )}
      {!email && !sms && (
        <span className="text-xs text-gray-500 dark:text-gray-400">No capabilities</span>
      )}
    </span>
  );
}
