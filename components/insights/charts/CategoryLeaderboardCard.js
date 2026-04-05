'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard';
import { chartTooltipProps } from './chartTooltipStyles';
import { chartPalette as C } from './palette';

export default function CategoryLeaderboardCard({
  data,
  title = 'Category Leaderboard',
  subtitle = 'Horizontal bars — ranking',
  barSeriesName = 'Share',
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart layout="vertical" data={data} margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
          <Tooltip {...chartTooltipProps} />
          <Bar dataKey="v" fill={C.g} name={barSeriesName} radius={[0, 8, 8, 0]} isAnimationActive animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
