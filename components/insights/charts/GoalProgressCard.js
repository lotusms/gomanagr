'use client';

import AnimatedProgressBar from './AnimatedProgressBar';
import ChartCard from './ChartCard';

const DEFAULT_BARS = [
  { label: 'Quarterly OKRs', value: 78, colorClass: 'bg-gradient-to-r from-primary-500 to-cyan-400' },
  { label: 'Client satisfaction', value: 92, colorClass: 'bg-gradient-to-r from-emerald-500 to-teal-400' },
  { label: 'Invoice collection', value: 64, colorClass: 'bg-gradient-to-r from-amber-500 to-orange-400' },
];

export default function GoalProgressCard({
  title = 'Goal Progress',
  subtitle = 'Animated bars',
  bars = DEFAULT_BARS,
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="space-y-5 pt-1">
        {bars.map((b, i) => (
          <AnimatedProgressBar key={i} label={b.label} value={b.value} max={100} colorClass={b.colorClass} />
        ))}
      </div>
    </ChartCard>
  );
}
