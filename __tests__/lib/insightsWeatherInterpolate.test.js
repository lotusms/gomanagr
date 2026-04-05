/**
 * Unit tests for interpolateHourlyWeatherNow.
 */

import { interpolateHourlyWeatherNow } from '@/lib/insightsWeatherInterpolate';

const t0 = '2025-01-01T12:00:00.000Z';
const t1 = '2025-01-01T13:00:00.000Z';
const t2 = '2025-01-01T14:00:00.000Z';

describe('interpolateHourlyWeatherNow', () => {
  it('returns null when points missing or too few', () => {
    expect(interpolateHourlyWeatherNow(null, Date.now())).toBeNull();
    expect(interpolateHourlyWeatherNow([], Date.now())).toBeNull();
    expect(interpolateHourlyWeatherNow([{ isoTime: t0, v: 1, w: 2 }], Date.now())).toBeNull();
  });

  it('returns null when isoTime parses to NaN', () => {
    expect(
      interpolateHourlyWeatherNow(
        [
          { isoTime: t0, v: 1, w: 2 },
          { isoTime: 'not-a-date', v: 3, w: 4 },
        ],
        Date.now()
      )
    ).toBeNull();
  });

  it('returns first point when now is at or before the first time', () => {
    const p0 = { isoTime: t0, v: 10, w: 20 };
    const p1 = { isoTime: t1, v: 30, w: 40 };
    const tFirst = new Date(t0).getTime();
    expect(interpolateHourlyWeatherNow([p0, p1], tFirst - 1000)).toEqual({ v: 10, w: 20 });
    expect(interpolateHourlyWeatherNow([p0, p1], tFirst)).toEqual({ v: 10, w: 20 });
  });

  it('returns last point when now is at or after the last time', () => {
    const p0 = { isoTime: t0, v: 1, w: 2 };
    const p1 = { isoTime: t1, v: 3, w: 4 };
    const tLast = new Date(t1).getTime();
    expect(interpolateHourlyWeatherNow([p0, p1], tLast)).toEqual({ v: 3, w: 4 });
    expect(interpolateHourlyWeatherNow([p0, p1], tLast + 3600_000)).toEqual({ v: 3, w: 4 });
  });

  it('linearly interpolates between two points', () => {
    const p0 = { isoTime: t0, v: 0, w: 100 };
    const p1 = { isoTime: t1, v: 100, w: 200 };
    const t0ms = new Date(t0).getTime();
    const t1ms = new Date(t1).getTime();
    const mid = t0ms + (t1ms - t0ms) / 2;
    const out = interpolateHourlyWeatherNow([p0, p1], mid);
    expect(out.v).toBeCloseTo(50, 5);
    expect(out.w).toBeCloseTo(150, 5);
  });

  it('ignores points without isoTime when building the series', () => {
    const p0 = { isoTime: t0, v: 1, w: 2 };
    const p1 = { v: 99, w: 99 };
    const p2 = { isoTime: t1, v: 3, w: 4 };
    const mid = (new Date(t0).getTime() + new Date(t1).getTime()) / 2;
    const out = interpolateHourlyWeatherNow([p0, p1, p2], mid);
    expect(out.v).toBeCloseTo(2, 5);
  });

});
