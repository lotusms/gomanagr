'use client';

import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { formatCurrency } from '@/utils/formatCurrency';
import ChartCard from './ChartCard';
import { mergeChartTooltipCurrency } from './chartCurrencyTooltip';
import { chartPalette as C } from './palette';

/** Recharts axis ticks are SVG text — set fontSize here (Tailwind on axes often has no effect). */
const AXIS_TICK = { fontSize: 8 };

export default function CorrelationCloudCard({
  data,
  title = 'Correlation Cloud',
  subtitle = 'Scatter + bubble size',
  xAxisName = 'Days to pay',
  yAxisName = 'Amount',
  scatterName = 'Invoices',
  currency = 'USD',
}) {
  const currencyCode = (currency || 'USD').toUpperCase();

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis type="number" dataKey="x" name={xAxisName} tick={AXIS_TICK} className="text-gray-500" />
          <YAxis
            type="number"
            dataKey="y"
            name={yAxisName}
            tick={AXIS_TICK}
            className="text-gray-500"
            tickFormatter={(v) => formatCurrency(v, currencyCode)}
            width={68}
          />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            {...mergeChartTooltipCurrency(currencyCode, { mode: 'keys', keys: ['y', 'z'] })}
          />
          <Scatter name={scatterName} data={data} fill={C.c} isAnimationActive animationDuration={700} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
