'use client';

import { HiCurrencyDollar, HiLightningBolt, HiTrendingUp, HiUsers } from 'react-icons/hi';
import InsightKpiTile from './InsightKpiTile';
import { formatCurrencyCompact, formatMomPercent } from '@/lib/insightsKpiAggregates';

/**
 * @param {object} props
 * @param {boolean} [props.loading]
 * @param {string} [props.currency='USD']
 * @param {{ pipelineTotal: number, clientCount: number, momPercent: number | null, momLabel: string, healthScore: number | null, healthLabel: string } | null} props.kpis
 */
export default function InsightsHeroKpis({ loading = false, currency = 'USD', kpis = null }) {
  const pipelineLabel = loading || !kpis ? '—' : formatCurrencyCompact(kpis.pipelineTotal, currency);
  const clientsLabel = loading || !kpis ? '—' : String(kpis.clientCount);
  const momLabel = loading || !kpis ? '—' : formatMomPercent(kpis.momPercent);
  const healthLabel =
    loading || !kpis ? '—' : kpis.healthScore != null ? String(kpis.healthScore) : '—';

  const tiles = [
    { id: 'pipeline', icon: HiCurrencyDollar, label: pipelineLabel, subtitle: 'Open pipeline (proposals)' },
    { id: 'clients', icon: HiUsers, label: clientsLabel, subtitle: 'Clients in workspace' },
    {
      id: 'mom',
      icon: HiTrendingUp,
      label: momLabel,
      subtitle: kpis?.momLabel ?? 'Paid revenue vs last month',
    },
    {
      id: 'health',
      icon: HiLightningBolt,
      label: healthLabel,
      subtitle: kpis?.healthLabel ?? 'Collection health',
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {tiles.map((t) => (
        <InsightKpiTile key={t.id} icon={t.icon} label={t.label} subtitle={t.subtitle} loading={loading} />
      ))}
    </div>
  );
}
