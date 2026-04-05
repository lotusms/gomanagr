'use client';

import AnimatedRing from './AnimatedRing';
import ChartCard from './ChartCard';

const DEFAULT_RINGS = [
  { value: 82, label: 'CSAT', sub: 'target 80%', stroke: '#0ea5e9' },
  { value: 67, label: 'Util.', sub: 'hours', stroke: '#8b5cf6' },
  { value: 91, label: 'SLA', sub: 'uptime', stroke: '#10b981' },
];

export default function CircularTargetsCard({
  title = 'Circular Targets',
  subtitle = 'SVG progress rings',
  rings = DEFAULT_RINGS,
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="grid grid-cols-3 gap-2">
        {rings.map((r, i) => (
          <AnimatedRing key={i} value={r.value} label={r.label} sub={r.sub} stroke={r.stroke} />
        ))}
      </div>
    </ChartCard>
  );
}
