'use client';

import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard';
import { chartPalette as C } from './palette';

export default function SparkTrendCard({
  data,
  className = 'md:col-span-2',
  title = 'Spark Trend',
  subtitle = 'Mini area — last 12 periods',
}) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.b} stopOpacity={0.5} />
              <stop offset="100%" stopColor={C.b} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={C.b} fill="url(#spark)" strokeWidth={2} isAnimationActive animationDuration={1200} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
