'use client';

import { motion } from 'framer-motion';

export default function AnimatedRing({ value, label, sub, stroke }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, value);
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center justify-center">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <p className="text-center mt-2 text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>
    </div>
  );
}
