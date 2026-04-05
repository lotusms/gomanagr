'use client';

import ChartCard from './ChartCard';
import MatrixHeat from './MatrixHeat';

export default function ActivityMatrixCard({
  rows,
  cols,
  data,
  className = '',
  title = 'Activity Matrix',
  subtitle = 'Heat-style grid',
}) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <div className="mx-auto w-full max-w-[240px] py-2">
        <MatrixHeat rows={rows} cols={cols} data={data} />
      </div>
    </ChartCard>
  );
}
