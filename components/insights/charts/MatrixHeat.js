'use client';

import { motion } from 'framer-motion';

export default function MatrixHeat({ rows, cols, data }) {
  const max = Math.max(...data.flat(), 1);
  return (
    <div className="space-y-1">
      <div
        className="grid gap-1 items-center"
        style={{ gridTemplateColumns: `minmax(2rem,auto) repeat(${cols.length}, minmax(0,1fr))` }}
      >
        <div />
        {cols.map((c) => (
          <div key={c} className="text-[10px] text-center font-medium text-gray-500 dark:text-gray-400 truncate px-0.5">
            {c}
          </div>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div
          key={row}
          className="grid gap-1 items-center"
          style={{ gridTemplateColumns: `minmax(2rem,auto) repeat(${cols.length}, minmax(0,1fr))` }}
        >
          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 pr-1">{row}</div>
          {data[ri].map((v, ci) => {
            const intensity = v / max;
            return (
              <motion.div
                key={`${ri}-${ci}`}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: ci * 0.03 + ri * 0.05 }}
                className="aspect-square rounded-md flex items-center justify-center text-[10px] font-mono font-medium text-white shadow-inner min-h-[28px]"
                style={{
                  background: `rgba(14, 165, 233, ${0.25 + intensity * 0.75})`,
                }}
                title={`${v}`}
              >
                {v}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
