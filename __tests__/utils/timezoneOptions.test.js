import {
  utcOffsetLabelForZone,
  timeZoneLongGenericName,
  listIanaTimeZoneIds,
  buildTimeZoneSelectOptions,
  ensureTimeZoneOption,
} from '@/utils/timezoneOptions';

describe('timezoneOptions', () => {
  it('utcOffsetLabelForZone returns UTC±HH:MM shape', () => {
    const ny = utcOffsetLabelForZone('America/New_York');
    expect(ny).toMatch(/^UTC[+-]\d{2}:\d{2}$/);
    expect(utcOffsetLabelForZone('UTC')).toMatch(/^UTC[+]00:00$/);
  });

  it('listIanaTimeZoneIds is a curated IANA list (not full ECMA-402 set)', () => {
    const ids = listIanaTimeZoneIds();
    expect(ids.length).toBeGreaterThan(50);
    expect(ids.length).toBeLessThan(250);
    expect(ids).toContain('UTC');
    expect(ids).toContain('America/New_York');
    expect(ids).toContain('Asia/Tokyo');
  });

  it('buildTimeZoneSelectOptions includes searchable generic name, IANA id, and offset', () => {
    const opts = buildTimeZoneSelectOptions();
    expect(opts.length).toBeGreaterThan(10);
    const utc = opts.find((o) => o.value === 'UTC');
    expect(utc).toBeDefined();
    expect(utc.label).toMatch(/^UTC \(UTC\+00:00\)$/);
    const ny = opts.find((o) => o.value === 'America/New_York');
    expect(timeZoneLongGenericName('America/New_York')).toMatch(/Eastern/i);
    expect(ny.label).toMatch(/Eastern.*America\/New_York \(UTC[+-]\d{2}:\d{2}\)/);
    const chi = opts.find((o) => o.value === 'America/Chicago');
    expect(chi.label).toMatch(/Central.*America\/Chicago/);
  });

  it('ensureTimeZoneOption prepends unknown value', () => {
    const base = [{ value: 'UTC', label: 'UTC (UTC+00:00)' }];
    const merged = ensureTimeZoneOption(base, 'Legacy/Zone');
    expect(merged[0].value).toBe('Legacy/Zone');
    expect(merged[0].label).toMatch(/Legacy\/Zone/);
  });
});
