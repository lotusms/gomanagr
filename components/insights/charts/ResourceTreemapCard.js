'use client';

import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import ChartCard from './ChartCard';
import { mergeChartTooltipCurrency } from './chartCurrencyTooltip';

export default function ResourceTreemapCard({
  nodes,
  className = 'md:col-span-2',
  title = 'Resource Treemap',
  subtitle = 'Hours by department',
  currency = 'USD',
}) {
  const currencyCode = (currency || 'USD').toUpperCase();

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={280}>
        <Treemap
          data={nodes}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="rgba(255,255,255,0.25)"
          isAnimationActive
          animationDuration={800}
        >
          <Tooltip {...mergeChartTooltipCurrency(currencyCode, { mode: 'all' })} />
        </Treemap>
      </ResponsiveContainer>
    </ChartCard>
  );
}
