'use client';

import { Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard';
import InsightsChartLegendContent from './InsightsChartLegendContent';
import { chartTooltipProps } from './chartTooltipStyles';
import { chartPalette as C } from './palette';

export default function TeamRadarCard({
  data,
  title = 'Team Radar',
  subtitle = 'Performance vs benchmark',
  seriesA = 'Current',
  seriesB = 'Prior',
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid className="stroke-gray-200 dark:stroke-gray-600" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-gray-600 dark:text-gray-300" />
          <Radar name={seriesA} dataKey="A" stroke={C.a} fill={C.a} fillOpacity={0.35} isAnimationActive animationDuration={1000} />
          <Radar name={seriesB} dataKey="B" stroke={C.b} fill={C.b} fillOpacity={0.25} isAnimationActive animationDuration={1000} />
          <Legend content={(props) => <InsightsChartLegendContent payload={props.payload} />} />
          <Tooltip {...chartTooltipProps} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
