'use client';

import { Cell, Legend, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard';
import InsightsChartLegendContent from './InsightsChartLegendContent';
import { chartTooltipProps } from './chartTooltipStyles';

export default function RadialKpisCard({
  data,
  title = 'Radial KPIs',
  subtitle = 'Multi-segment rings',
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={280}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="20%"
          outerRadius="90%"
          barSize={14}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            background
            dataKey="value"
            cornerRadius={8}
            isAnimationActive
            animationDuration={1100}
          >
            {data.map((e, i) => (
              <Cell key={i} fill={e.fill} />
            ))}
          </RadialBar>
          <Legend
            verticalAlign="bottom"
            content={(props) => <InsightsChartLegendContent payload={props.payload} />}
          />
          <Tooltip {...chartTooltipProps} />
        </RadialBarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
