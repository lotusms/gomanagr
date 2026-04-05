'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/utils/formatCurrency';
import ChartCard from './ChartCard';
import InsightsChartLegendContent from './InsightsChartLegendContent';
import { mergeChartTooltipCurrency } from './chartCurrencyTooltip';
import { chartPalette as C } from './palette';

export default function StackedPerformanceCard({
  data,
  title = 'Stacked Performance',
  subtitle = 'Multi-series bars',
  stackLegend = { a: 'Series A', b: 'Series B', c: 'Series C' },
  currency = 'USD',
}) {
  const currencyCode = (currency || 'USD').toUpperCase();

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis dataKey="m" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => formatCurrency(v, currencyCode)} width={72} tick={{ fontSize: 10 }} />
          <Tooltip {...mergeChartTooltipCurrency(currencyCode, { mode: 'all' })} />
          <Legend content={(props) => <InsightsChartLegendContent payload={props.payload} />} />
          <Bar name={stackLegend.a} dataKey="a" stackId="s" fill={C.a} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} />
          <Bar name={stackLegend.b} dataKey="b" stackId="s" fill={C.b} isAnimationActive animationDuration={800} />
          <Bar name={stackLegend.c} dataKey="c" stackId="s" fill={C.d} radius={[0, 0, 4, 4]} isAnimationActive animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
