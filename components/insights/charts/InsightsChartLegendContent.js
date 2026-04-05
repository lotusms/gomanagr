'use client';

import { useMemo } from 'react';

/** Align legend order with pie slice order (`data[].name`). */
export function sortLegendPayloadByDataNames(payload, data) {
  if (!payload?.length) return [];
  return [...payload].sort((a, b) => {
    const nameA = a?.payload?.name ?? a?.value;
    const nameB = b?.payload?.name ?? b?.value;
    const i = data.findIndex((d) => d.name === nameA);
    const j = data.findIndex((d) => d.name === nameB);
    return (i >= 0 ? i : data.length) - (j >= 0 ? j : data.length);
  });
}

/**
 * Recharts default legend paints labels with series colors; we keep swatches in series colors
 * and render labels in neutral dark text (matches insights donut / bar legends).
 *
 * **Layout:** exactly **two** series → one centered horizontal row (recommended for dual-metric charts).
 * Otherwise → two-column grid.
 *
 * @param {'auto' | 'twoColumn' | 'centered' | 'column'} [layout='auto'] — `column`: single vertical stack (e.g. pie legend to the right).
 */
export default function InsightsChartLegendContent({ payload, layout = 'auto' }) {
  const rows = useMemo(() => (Array.isArray(payload) ? payload.filter(Boolean) : []), [payload]);
  if (!rows.length) return null;

  const resolved =
    layout === 'column'
      ? 'column'
      : layout === 'centered'
        ? 'centered'
        : layout === 'twoColumn'
          ? 'twoColumn'
          : rows.length === 2
            ? 'centered'
            : 'twoColumn';

  const listClass =
    resolved === 'column'
      ? 'm-0 flex w-full list-none flex-col justify-center gap-2 p-0 sm:gap-2.5'
      : resolved === 'centered'
        ? 'mb-0 mt-3 flex w-full flex-wrap list-none items-center justify-center gap-x-5 gap-y-2 p-0 sm:mt-4 sm:gap-x-6'
        : 'mb-0 mt-4 grid w-full list-none grid-cols-2 gap-x-4 gap-y-2 p-0 sm:mt-5 sm:gap-x-6';

  return (
    <ul className={listClass}>
      {rows.map((entry, index) => {
        const label = entry.value ?? entry.payload?.name ?? String(entry.dataKey ?? '—');
        return (
          <li
            key={`${label}-${index}`}
            className="flex min-w-0 items-center gap-2 text-left text-xs text-gray-900 dark:text-gray-100 sm:text-sm"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="min-w-0 leading-snug">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
