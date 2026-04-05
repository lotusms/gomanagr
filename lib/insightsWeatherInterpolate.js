/**
 * Linear interpolation of hourly temperature (v) and humidity (w) at `nowMs`
 * using `isoTime` on each point (same shape as `/api/insights/weather-stream` points).
 */
export function interpolateHourlyWeatherNow(points, nowMs) {
  if (!points?.length) return null;
  const withTime = points.filter((p) => p.isoTime);
  if (withTime.length < 2) return null;
  const times = withTime.map((p) => new Date(p.isoTime).getTime());
  if (times.some((t) => Number.isNaN(t))) return null;

  if (nowMs <= times[0]) {
    return { v: withTime[0].v, w: withTime[0].w };
  }
  if (nowMs >= times[times.length - 1]) {
    const last = withTime[withTime.length - 1];
    return { v: last.v, w: last.w };
  }
  for (let i = 0; i < times.length - 1; i += 1) {
    if (nowMs >= times[i] && nowMs <= times[i + 1]) {
      const span = times[i + 1] - times[i];
      const u = span > 0 ? (nowMs - times[i]) / span : 0;
      return {
        v: withTime[i].v + u * (withTime[i + 1].v - withTime[i].v),
        w: withTime[i].w + u * (withTime[i + 1].w - withTime[i].w),
      };
    }
  }
  return null;
}
