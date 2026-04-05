'use client';

import { motion } from 'framer-motion';

export default function AnimatedProgressBar({ label, value, max, colorClass }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
        <span>{label}</span>
        <span className="font-mono font-medium">{pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
