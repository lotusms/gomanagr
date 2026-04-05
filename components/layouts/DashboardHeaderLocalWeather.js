'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { interpolateHourlyWeatherNow } from '@/lib/insightsWeatherInterpolate';

const DEFAULT_COORDS = { lat: 40.7128, lon: -74.006 };

export default function DashboardHeaderLocalWeather() {
  const [coords, setCoords] = useState(() => ({ ...DEFAULT_COORDS }));
  const [livePoints, setLivePoints] = useState([]);
  const [tick, setTick] = useState(() => Date.now());
  const [tempUnit, setTempUnit] = useState('°F');

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
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

  const fetchWeather = useCallback(async () => {
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
      if (!r.ok || !j.points?.length) return;
      setLivePoints(j.points);
      const u = j.meta?.temperatureUnit === 'celsius' ? '°C' : '°F';
      setTempUnit(u);
    } catch (_) {
      /* keep last points */
    }
  }, [coords.lat, coords.lon]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  useEffect(() => {
    const id = setInterval(fetchWeather, 60 * 1000);
    return () => clearInterval(id);
  }, [fetchWeather]);

  const nowSample = useMemo(
    () => interpolateHourlyWeatherNow(livePoints, tick),
    [livePoints, tick]
  );

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
    <div
      className="flex min-w-0 items-center gap-2 border-l border-gray-200 pl-2 ml-1 dark:border-gray-600 sm:ml-3 sm:gap-3 sm:pl-3"
      aria-label="Local weather and time"
    >
      <span
        className="text-xs font-semibold tabular-nums text-gray-900 dark:text-white sm:text-sm"
        title="Approximate current temperature (interpolated from hourly forecast)"
      >
        {nowSample != null ? (
          <>
            {nowSample.v.toFixed(1)}
            <span className="font-medium text-gray-500 dark:text-gray-400">{tempUnit}</span>
          </>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        )}
      </span>
      <time
        dateTime={new Date(tick).toISOString()}
        className="text-xs tabular-nums text-gray-600 dark:text-gray-300 sm:text-sm"
        title="Your device local time"
        suppressHydrationWarning
      >
        {timeStr}
      </time>
    </div>
  );
}
