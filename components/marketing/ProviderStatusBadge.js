'use client';

/**
 * Badge showing provider connection status: connected, not_connected, misconfigured.
 */
export default function ProviderStatusBadge({ status }) {
  const statusLower = (status || '').toLowerCase();
  const styles = {
    connected: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    not_connected: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    misconfigured: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
  };
  const labels = {
    connected: 'Connected',
    not_connected: 'Not connected',
    misconfigured: 'Misconfigured',
  };
  const cls = styles[statusLower] || styles.not_connected;
  const label = labels[statusLower] || 'Not connected';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
