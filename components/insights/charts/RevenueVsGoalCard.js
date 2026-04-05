'use client';

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/utils/formatCurrency';
import ChartCard from './ChartCard';
import InsightsChartLegendContent from './InsightsChartLegendContent';
import { mergeChartTooltipCurrency } from './chartCurrencyTooltip';
import { chartPalette as C } from './palette';

export default function RevenueVsGoalCard({
  data,
  title = 'Revenue vs Goal',
  subtitle = 'Composed: bars + trend line',
  legendNames = { bar: 'Revenue', line: 'Goal' },
  currency = 'USD',
}) {
  const currencyCode = (currency || 'USD').toUpperCase();

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis dataKey="q" />
          <YAxis tickFormatter={(v) => formatCurrency(v, currencyCode)} width={72} tick={{ fontSize: 10 }} />
          <Tooltip {...mergeChartTooltipCurrency(currencyCode, { mode: 'all' })} />
          <Legend content={(props) => <InsightsChartLegendContent payload={props.payload} />} />
          <Bar dataKey="rev" fill={C.a} name={legendNames.bar} radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive />
          <Line type="monotone" dataKey="goal" stroke={C.e} strokeWidth={3} dot={{ r: 4 }} name={legendNames.line} isAnimationActive />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
