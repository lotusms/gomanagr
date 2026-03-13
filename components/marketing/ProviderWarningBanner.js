'use client';

import { HiExclamation } from 'react-icons/hi';

/**
 * Banner for provider warnings: no provider, not configured, compliance notes.
 */
export default function ProviderWarningBanner({ title, message, variant = 'warning' }) {
  const bg = variant === 'error'
    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
  const iconCls = variant === 'error'
    ? 'text-red-600 dark:text-red-400'
    : 'text-amber-600 dark:text-amber-400';
  const textCls = variant === 'error'
    ? 'text-red-800 dark:text-red-200'
    : 'text-amber-800 dark:text-amber-200';

  return (
    <div className={`rounded-lg border p-4 flex gap-3 ${bg}`}>
      <HiExclamation className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconCls}`} />
      <div>
        {title && <p className={`font-medium text-sm ${textCls}`}>{title}</p>}
        {message && <p className={`text-sm mt-1 ${textCls}`}>{message}</p>}
      </div>
    </div>
  );
}
