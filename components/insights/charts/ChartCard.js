'use client';

import { motion } from 'framer-motion';
import { itemVariants } from './motionVariants';

/** Subtle neutral wash so every chart card matches; avoids per-card accent tints. */
const CARD_SURFACE =
  'bg-gradient-to-br from-gray-100/50 via-transparent to-transparent dark:from-gray-800/45 dark:via-gray-900/20 dark:to-transparent';

export default function ChartCard({
  title,
  subtitle,
  children,
  className = '',
  badge,
  topRight,
  /** When true: title + topRight on first row; badge on full-width row below (e.g. weather metrics). */
  stackBadgeBelowTitle = false,
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`relative overflow-hidden rounded-2xl border border-gray-200/90 dark:border-gray-700/90 bg-white dark:bg-gray-900 backdrop-blur-sm shadow-md shadow-gray-200/30 dark:shadow-none ${className}`}
    >
      {topRight != null && !stackBadgeBelowTitle && (
        <div className="absolute top-3 right-3 z-20 sm:top-4 sm:right-4">{topRight}</div>
      )}
      <div className={`absolute inset-0 z-0 ${CARD_SURFACE} pointer-events-none`} aria-hidden />
      {stackBadgeBelowTitle ? (
        <div className="relative z-10 border-b border-gray-100 dark:border-gray-800 p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">{title}</h3>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
              )}
            </div>
            {topRight != null && <div className="shrink-0 pt-0.5">{topRight}</div>}
          </div>
          {badge != null && <div className="w-full min-w-0">{badge}</div>}
        </div>
      ) : (
        <div
          className={`relative z-10 p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-start justify-between gap-2 ${
            topRight != null ? 'pr-14 sm:pr-16' : ''
          }`}
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {badge}
        </div>
      )}
      <div className="relative p-3 sm:p-4 min-h-[220px]">{children}</div>
    </motion.div>
  );
}
