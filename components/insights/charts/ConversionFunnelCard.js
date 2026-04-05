'use client';

import { Cell, Funnel, FunnelChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard';
import { chartTooltipProps } from './chartTooltipStyles';

export default function ConversionFunnelCard({
  data,
  title = 'Conversion Funnel',
  subtitle = 'Stage drop-off',
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={280}>
        <FunnelChart>
          <Tooltip {...chartTooltipProps} />
          <Funnel
            dataKey="value"
            data={data}
            isAnimationActive
            animationDuration={900}
            label={{
              dataKey: 'value',
              position: 'center',
              fill: '#ffffff',
              stroke: 'rgba(15, 23, 42, 0.35)',
              strokeWidth: 2,
              paintOrder: 'stroke fill',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {data.map((e, i) => (
              <Cell key={i} fill={e.fill} />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
