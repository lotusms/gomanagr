'use client';

import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard';
import { mergeChartTooltipCurrency } from './chartCurrencyTooltip';
import InsightsChartLegendContent, { sortLegendPayloadByDataNames } from './InsightsChartLegendContent';

export default function RevenueMixCard({
  data,
  title = 'Revenue Mix',
  subtitle = 'Share of revenue by category',
  /** ISO code from account settings (`clientSettings.defaultCurrency`) */
  currency = 'USD',
}) {
  const currencyCode = (currency || 'USD').toUpperCase();

  const legendPayload = useMemo(() => {
    const raw = data.map((d) => ({
      value: d.name,
      color: d.fill,
      payload: d,
    }));
    return sortLegendPayloadByDataNames(raw, data);
  }, [data]);

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="min-h-[260px] min-w-0 flex-1">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={96}
                paddingAngle={4}
                dataKey="value"
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip {...mergeChartTooltipCurrency(currencyCode, { mode: 'all' })} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <aside className="shrink-0 sm:max-w-[13rem] sm:border-l sm:border-gray-200 sm:pl-6 sm:dark:border-gray-600">
          <InsightsChartLegendContent payload={legendPayload} layout="column" />
        </aside>
      </div>
    </ChartCard>
  );
}
