/**
 * Shared Recharts Tooltip styling for Insights charts.
 * Mid-tone slate surface with **forced light text**: Recharts otherwise applies `entry.color`
 * (chart line hues) to tooltip rows, which reads poorly on slate (low contrast).
 */
export const chartTooltipContentStyle = {
  margin: 0,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(148, 163, 184, 0.45)',
  backgroundColor: 'rgba(71, 85, 105, 0.96)',
  boxShadow: '0 10px 28px -10px rgba(15, 23, 42, 0.35)',
  whiteSpace: 'nowrap',
  color: '#ffffff',
};

export const chartTooltipLabelStyle = {
  color: '#ffffff',
  fontWeight: 600,
  fontSize: 12,
  marginBottom: 6,
};

/** `color` is applied after Recharts’ per-series color so labels/values stay legible */
export const chartTooltipItemStyle = {
  color: '#ffffff',
  fontWeight: 500,
  paddingTop: 3,
  paddingBottom: 3,
  fontSize: 12,
};

/** Spread onto `<Tooltip />` */
export const chartTooltipProps = {
  contentStyle: chartTooltipContentStyle,
  labelStyle: chartTooltipLabelStyle,
  itemStyle: chartTooltipItemStyle,
};
