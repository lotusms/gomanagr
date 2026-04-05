'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { ResponsiveContainer, SunburstChart, Tooltip } from 'recharts';
import { formatCurrency } from '@/utils/formatCurrency';
import ChartCard from './ChartCard';
import { mergeChartTooltipCurrency } from './chartCurrencyTooltip';
import InsightsChartLegendContent, { sortLegendPayloadByDataNames } from './InsightsChartLegendContent';

const ANIMATION_MS = 1000;

/** Same traversal order as Recharts Sunburst `drawArcs` (pre-order: node, then its children). */
function collectSunburstNodesInRenderOrder(tree) {
  const out = [];
  function walk(children) {
    if (!children?.length) return;
    children.forEach((child) => {
      if (child && typeof child.value === 'number') out.push(child);
      walk(child.children);
    });
  }
  walk(tree?.children);
  return out;
}

export default function RegionalSunburstCard({
  data,
  className = '',
  title = 'Regional Sunburst',
  subtitle = 'Hierarchical revenue',
  currency = 'USD',
}) {
  const currencyCode = (currency || 'USD').toUpperCase();
  const wrapRef = useRef(null);

  const legendPayload = useMemo(() => {
    const rows = data?.children ?? [];
    const raw = rows.map((d) => ({
      value: d.name,
      color: d.fill,
      payload: d,
    }));
    return sortLegendPayloadByDataNames(raw, rows);
  }, [data]);

  /** Recharts renders sector labels as raw `value` numbers; replace with account currency (same as `formatCurrency` elsewhere). */
  useLayoutEffect(() => {
    const apply = () => {
      const root = wrapRef.current;
      if (!root) return;
      const ordered = collectSunburstNodesInRenderOrder(data);
      const textEls = root.querySelectorAll('.recharts-sunburst text.recharts-text');
      textEls.forEach((textEl, i) => {
        const node = ordered[i];
        if (node && typeof node.value === 'number') {
          textEl.textContent = formatCurrency(node.value, currencyCode);
        }
      });
    };
    apply();
    const t = window.setTimeout(apply, ANIMATION_MS + 80);
    const id = requestAnimationFrame(apply);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(id);
    };
  }, [data, currencyCode]);

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div ref={wrapRef} className="min-h-[260px] min-w-0 flex-1">
          <ResponsiveContainer width="100%" height={280}>
            <SunburstChart
              data={data}
              dataKey="value"
              isAnimationActive
              animationDuration={ANIMATION_MS}
            >
              <Tooltip {...mergeChartTooltipCurrency(currencyCode, { mode: 'all' })} />
            </SunburstChart>
          </ResponsiveContainer>
        </div>
        <aside className="shrink-0 sm:max-w-[13rem] sm:border-l sm:border-gray-200 sm:pl-6 sm:dark:border-gray-600">
          <InsightsChartLegendContent payload={legendPayload} layout="column" />
        </aside>
      </div>
    </ChartCard>
  );
}
