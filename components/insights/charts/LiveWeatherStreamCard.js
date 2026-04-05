'use client';

import { useId, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { interpolateHourlyWeatherNow } from '@/lib/insightsWeatherInterpolate';
import ChartCard from './ChartCard';
import InsightsChartLegendContent from './InsightsChartLegendContent';
import { chartTooltipProps } from './chartTooltipStyles';
import { chartPalette as C } from './palette';

/** Recharts axis ticks are SVG text — set fontSize here (Tailwind on YAxis often has no effect). */
const AXIS_TICK = { fontSize: 8 };

function LiveCornerIndicator() {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/[0.12] px-2.5 py-1 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-500/10"
      title="Stream refreshes every 12s; values tick every 1s"
    >
      <motion.span
        className="relative flex h-2 w-2 shrink-0"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.75)]" />
      </motion.span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Live</span>
    </div>
  );
}

function WeatherMetricCell({ label, children }) {
  return (
    <div className="min-w-[5.25rem] rounded-xl border border-gray-200/90 bg-gray-50/90 px-3 py-2 text-center shadow-sm dark:border-gray-600/70 dark:bg-gray-800/55 sm:min-w-[5.75rem]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <div className="mt-1 text-base font-semibold tabular-nums leading-tight text-gray-900 dark:text-white sm:text-lg">
        {children}
      </div>
    </div>
  );
}

function WeatherMetricStrip({ tick, nowSample, tempUnit }) {
  const timeStr = useMemo(
    () =>
      new Date(tick).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      }),
    [tick]
  );

  return (
    <div className="flex flex-wrap items-stretch justify-start gap-2 sm:gap-2.5">
      {nowSample != null ? (
        <>
          <WeatherMetricCell label="Temperature">
            <>
              {nowSample.v.toFixed(1)}
              {' '}
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{tempUnit}</span>
            </>
          </WeatherMetricCell>
          <WeatherMetricCell label="Humidity">
            <>
              {nowSample.w.toFixed(0)}
              {' '}
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">% RH</span>
            </>
          </WeatherMetricCell>
        </>
      ) : null}
      <WeatherMetricCell label="Time">{timeStr}</WeatherMetricCell>
    </div>
  );
}

export default function LiveWeatherStreamCard({
  livePoints,
  loading = false,
  error = null,
  locationHint = '',
  primaryLabel = 'Temperature (°F)',
  secondaryLabel = 'Humidity (% RH)',
  /** Bump when new forecast payload arrives so the chart re-animates */
  dataRevision = 0,
  className = 'md:col-span-2 xl:col-span-2',
}) {
  const gid = useId().replace(/:/g, '');
  const g1 = `lw-g1-${gid}`;
  const g2 = `lw-g2-${gid}`;

  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const nowSample = useMemo(
    () => interpolateHourlyWeatherNow(livePoints, tick),
    [livePoints, tick]
  );

  const tempUnit = primaryLabel.includes('°C') ? '°C' : '°F';

  const trimmedLocation = typeof locationHint === 'string' ? locationHint.trim() : '';
  const title =
    trimmedLocation.length > 0
      ? `Live Weather Forecast for ${trimmedLocation}`
      : 'Live Weather Forecast';

  return (
    <ChartCard
      title={title}
      stackBadgeBelowTitle
      topRight={!error ? <LiveCornerIndicator /> : null}
      badge={
        !error ? (
          <WeatherMetricStrip tick={tick} nowSample={!loading ? nowSample : null} tempUnit={tempUnit} />
        ) : null
      }
      className={className}
    >
      {error ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-8 text-center dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      ) : null}
      <div
        className={`relative min-h-[260px] overflow-hidden rounded-xl ${error ? 'hidden' : ''}`}
      >
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-xl">
          <motion.div
            className="absolute inset-y-3 left-0 w-[40%] bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/[0.08]"
            initial={{ x: '-100%' }}
            animate={{ x: ['-20%', '320%'] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div className="relative z-[2]">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={livePoints} key={dataRevision}>
              <defs>
                <linearGradient id={g1} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.a} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={C.a} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={g2} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.b} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={C.b} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                interval="preserveStartEnd"
                minTickGap={24}
                className="text-gray-500"
              />
              <YAxis
                yAxisId="temp"
                tick={AXIS_TICK}
                className="text-gray-500"
                domain={['auto', 'auto']}
                tickFormatter={(v) => `${v}`}
              />
              <YAxis
                yAxisId="hum"
                orientation="right"
                tick={AXIS_TICK}
                className="text-gray-500"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip {...chartTooltipProps} labelFormatter={(label) => label} />
              <Legend content={(props) => <InsightsChartLegendContent payload={props.payload} />} />
              <Area
                yAxisId="temp"
                name={primaryLabel}
                type="monotone"
                dataKey="v"
                stroke={C.a}
                fill={`url(#${g1})`}
                strokeWidth={2}
                isAnimationActive
                animationDuration={450}
              />
              <Area
                yAxisId="hum"
                name={secondaryLabel}
                type="monotone"
                dataKey="w"
                stroke={C.b}
                fill={`url(#${g2})`}
                strokeWidth={2}
                isAnimationActive
                animationDuration={450}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/60 dark:bg-gray-900/50 backdrop-blur-[1px]">
            <p className="text-sm text-gray-600 dark:text-gray-300">Loading weather…</p>
          </div>
        )}
      </div>
      <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 px-1 leading-relaxed">
        Place names via{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary-500"
        >
          OpenStreetMap
        </a>
        . Weather data by{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-500">
          Open-Meteo
        </a>
        .
      </p>
    </ChartCard>
  );
}
