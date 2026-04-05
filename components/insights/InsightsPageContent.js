'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { buildInsightsChartBundle } from '@/lib/insightsChartData';
import { computeInsightKpis } from '@/lib/insightsKpiAggregates';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import InsightsHeroKpis from './InsightsHeroKpis';
import {
  ActivityMatrixCard,
  CategoryLeaderboardCard,
  CircularTargetsCard,
  containerVariants,
  ConversionFunnelCard,
  CorrelationCloudCard,
  GoalProgressCard,
  itemVariants,
  LiveWeatherStreamCard,
  RadialKpisCard,
  RegionalSunburstCard,
  ResourceTreemapCard,
  RevenueMixCard,
  RevenueVsGoalCard,
  SparkTrendCard,
  StackedPerformanceCard,
  TeamRadarCard,
} from './charts';

const STREAM_HOURS = 24;

function buildPlaceholderStreamPoints() {
  const slotMs = 60 * 60 * 1000;
  const now = Date.now();
  const windowStartMs = now - STREAM_HOURS * slotMs;
  return Array.from({ length: STREAM_HOURS }, (_, i) => ({
    t: i,
    v: 0,
    w: 0,
    label: new Date(windowStartMs + i * slotMs).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
    }),
  }));
}

const DEFAULT_COORDS = { lat: 40.7128, lon: -74.006 };

export default function InsightsPageContent() {
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiSnapshot, setKpiSnapshot] = useState(null);
  const [insightEntities, setInsightEntities] = useState({ clients: [], invoices: [], proposals: [] });

  const [coords, setCoords] = useState(() => ({ ...DEFAULT_COORDS }));
  const [locationHint, setLocationHint] = useState('Finding place name…');
  const [livePoints, setLivePoints] = useState(() => buildPlaceholderStreamPoints());
  const [streamLoading, setStreamLoading] = useState(true);
  const [streamError, setStreamError] = useState(null);
  const [weatherLabels, setWeatherLabels] = useState({
    primary: 'Temperature (°F)',
    secondary: 'Humidity (% RH)',
  });
  const [weatherDataRevision, setWeatherDataRevision] = useState(0);
  const placeResolveSeq = useRef(0);

  const placeholderStreamPoints = useMemo(() => buildPlaceholderStreamPoints(), []);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((a) => setUserAccount(a || null))
      .catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setKpiLoading(false);
      setKpiSnapshot(null);
      setInsightEntities({ clients: [], invoices: [], proposals: [] });
      return;
    }
    let cancelled = false;
    setKpiLoading(true);
    const orgId = organization?.id ?? undefined;
    Promise.all([
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      }).then((r) => r.json()),
      fetch('/api/get-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
      }).then((r) => r.json()),
      fetch('/api/get-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
      }).then((r) => r.json()),
    ])
      .then(([cRes, iRes, pRes]) => {
        if (cancelled) return;
        const clients = cRes.clients || [];
        const invoices = iRes.invoices || [];
        const proposals = pRes.proposals || [];
        setInsightEntities({ clients, invoices, proposals });
        setKpiSnapshot(computeInsightKpis({ clients, invoices, proposals }));
      })
      .catch(() => {
        if (!cancelled) {
          setKpiSnapshot(null);
          setInsightEntities({ clients: [], invoices: [], proposals: [] });
        }
      })
      .finally(() => {
        if (!cancelled) setKpiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, organization?.id]);

  const defaultCurrency = userAccount?.clientSettings?.defaultCurrency || 'USD';

  const charts = useMemo(
    () =>
      buildInsightsChartBundle({
        clients: insightEntities.clients,
        invoices: insightEntities.invoices,
        proposals: insightEntities.proposals,
        industry: organization?.industry || '',
      }),
    [insightEntities, organization?.industry]
  );

  const resolvePlaceLabel = useCallback(async (lat, lon) => {
    const seq = ++placeResolveSeq.current;
    setLocationHint('Finding place name…');
    try {
      const r = await fetch('/api/insights/reverse-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          acceptLanguage: typeof navigator !== 'undefined' ? navigator.language : 'en',
        }),
      });
      const j = await r.json();
      if (seq !== placeResolveSeq.current) return;
      if (r.ok && j.label) {
        setLocationHint(j.label);
        return;
      }
    } catch (_) {
      if (seq !== placeResolveSeq.current) return;
    }
    if (seq !== placeResolveSeq.current) return;
    setLocationHint(`Near ${lat.toFixed(2)}°, ${lon.toFixed(2)}°.`);
  }, []);

  useEffect(() => {
    resolvePlaceLabel(coords.lat, coords.lon);
  }, [coords.lat, coords.lon, resolvePlaceLabel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 600_000 }
    );
  }, []);

  const fetchWeatherStream = useCallback(
    async ({ silent } = {}) => {
      if (!silent) setStreamLoading(true);
      setStreamError(null);
      try {
        const r = await fetch('/api/insights/weather-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: coords.lat,
            longitude: coords.lon,
            temperatureUnit: 'fahrenheit',
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Failed to load weather');
        setLivePoints(j.points?.length ? j.points : placeholderStreamPoints);
        const s = j.meta?.series;
        if (s?.v?.label && s?.w?.label) {
          setWeatherLabels({ primary: s.v.label, secondary: s.w.label });
        }
      } catch (e) {
        if (!silent) {
          setStreamError(e.message || 'Could not load weather');
          setLivePoints(placeholderStreamPoints);
        }
      } finally {
        if (!silent) setStreamLoading(false);
      }
    },
    [coords.lat, coords.lon, placeholderStreamPoints]
  );

  useEffect(() => {
    fetchWeatherStream({ silent: false });
  }, [fetchWeatherStream]);

  useEffect(() => {
    const id = setInterval(() => fetchWeatherStream({ silent: true }), 12 * 1000);
    return () => clearInterval(id);
  }, [fetchWeatherStream]);

  const cc = charts.chartCopy;

  return (
    <motion.div
      className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Insights
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300 max-w-2xl">
            Reports and visual analytics.
          </p>
        </div>
        <InsightsHeroKpis loading={kpiLoading} currency={defaultCurrency} kpis={kpiSnapshot} />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <LiveWeatherStreamCard
          livePoints={livePoints}
          loading={streamLoading}
          error={streamError}
          locationHint={locationHint}
          primaryLabel={weatherLabels.primary}
          secondaryLabel={weatherLabels.secondary}
          dataRevision={weatherDataRevision}
        />
        <RevenueMixCard
          data={charts.pieData}
          title={cc.revenueMixTitle}
          subtitle={cc.revenueMixSubtitle}
          currency={defaultCurrency}
        />
        <TeamRadarCard
          data={charts.radarData}
          title={cc.teamRadarTitle}
          subtitle={cc.teamRadarSubtitle}
          seriesA={charts.radarSeriesA}
          seriesB={charts.radarSeriesB}
        />
        <ConversionFunnelCard data={charts.funnelData} title={cc.funnelTitle} subtitle={cc.funnelSubtitle} />
        <RadialKpisCard data={charts.radialData} title={cc.radialTitle} subtitle={cc.radialSubtitle} />
        <ResourceTreemapCard
          nodes={charts.treemapNodes}
          title={cc.treemapTitle}
          subtitle={cc.treemapSubtitle}
          currency={defaultCurrency}
        />
        <CorrelationCloudCard
          data={charts.scatterData}
          title={cc.scatterTitle}
          subtitle={cc.scatterSubtitle}
          scatterName={charts.terms.invoice}
          currency={defaultCurrency}
        />
        <RegionalSunburstCard
          data={charts.sunburstData}
          title={cc.sunburstTitle}
          subtitle={cc.sunburstSubtitle}
          currency={defaultCurrency}
        />
        <StackedPerformanceCard
          data={charts.stacked}
          title={cc.stackedTitle}
          subtitle={cc.stackedSubtitle}
          stackLegend={charts.stackLegend}
          currency={defaultCurrency}
        />
        <RevenueVsGoalCard
          data={charts.composed}
          title={cc.revenueGoalTitle}
          subtitle={cc.revenueGoalSubtitle}
          legendNames={charts.revenueGoalLegend}
          currency={defaultCurrency}
        />
        <CategoryLeaderboardCard
          data={charts.horizontalRank}
          title={cc.categoryTitle}
          subtitle={cc.categorySubtitle}
          barSeriesName="Share"
        />
        <ActivityMatrixCard
          rows={charts.matrixRows}
          cols={charts.matrixCols}
          data={charts.matrixData}
          title={cc.matrixTitle}
          subtitle={cc.matrixSubtitle}
        />
        <GoalProgressCard
          title={cc.goalProgressTitle}
          subtitle={cc.goalProgressSubtitle}
          bars={charts.goalProgress.bars}
        />
        <CircularTargetsCard
          title={cc.circularTitle}
          subtitle={cc.circularSubtitle}
          rings={charts.circularTargets.rings}
        />
        <SparkTrendCard data={charts.sparkData} title={cc.sparkTitle} subtitle={cc.sparkSubtitle} />
      </div>
    </motion.div>
  );
}
