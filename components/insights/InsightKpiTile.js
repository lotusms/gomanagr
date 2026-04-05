'use client';

import { motion } from 'framer-motion';

/**
 * @param {object} props
 * @param {import('react').ComponentType<{ className?: string }>} props.icon - React icon component
 * @param {string} props.label - Main value (pre-formatted)
 * @param {string} props.subtitle - Caption under the value
 * @param {boolean} [props.loading]
 */
export default function InsightKpiTile({ icon: Icon, label, subtitle, loading = false }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 px-4 py-3 shadow-md min-w-[120px]"
    >
      {Icon ? <Icon className="w-5 h-5 text-primary-500 mb-1" /> : null}
      <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
        {loading ? <span className="inline-block h-6 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /> : label}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {loading ? <span className="inline-block h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-700" /> : subtitle}
      </p>
    </motion.div>
  );
}
