/**
 * Hourly weather for the insights live chart.
 * Data source: Open-Meteo (https://open-meteo.com/) — free, no API key for non-commercial fair use.
 *
 * POST body: { latitude: number, longitude: number, temperatureUnit?: 'fahrenheit' | 'celsius' }
 */

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

function clampLatLng(lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { lat: la, lon: lo };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { latitude, longitude, temperatureUnit = 'fahrenheit' } = req.body || {};
  const coords = clampLatLng(latitude, longitude);
  if (!coords) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  }

  const tempUnit = temperatureUnit === 'celsius' ? 'celsius' : 'fahrenheit';

  try {
    const url = new URL(OPEN_METEO);
    url.searchParams.set('latitude', String(coords.lat));
    url.searchParams.set('longitude', String(coords.lon));
    url.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m');
    url.searchParams.set('forecast_hours', '24');
    url.searchParams.set('temperature_unit', tempUnit);
    url.searchParams.set('timezone', 'auto');

    const r = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!r.ok) {
      console.error('[insights/weather-stream] Open-Meteo HTTP', r.status);
      return res.status(502).json({ error: 'Weather service unavailable' });
    }

    const data = await r.json();
    const hourly = data.hourly;
    if (!hourly?.time?.length || !hourly.temperature_2m || !hourly.relative_humidity_2m) {
      return res.status(502).json({ error: 'Invalid weather response' });
    }

    const n = Math.min(
      hourly.time.length,
      hourly.temperature_2m.length,
      hourly.relative_humidity_2m.length,
      24
    );

    const tempLabel = tempUnit === 'fahrenheit' ? '°F' : '°C';
    const points = Array.from({ length: n }, (_, i) => {
      const t = hourly.time[i];
      const d = t ? new Date(t) : new Date();
      return {
        t: i,
        isoTime: typeof t === 'string' ? t : d.toISOString(),
        v: Math.round(hourly.temperature_2m[i] * 10) / 10,
        w: Math.round(hourly.relative_humidity_2m[i]),
        label: d.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
        }),
      };
    });

    return res.status(200).json({
      points,
      meta: {
        source: 'Open-Meteo',
        sourceUrl: 'https://open-meteo.com/',
        latitude: coords.lat,
        longitude: coords.lon,
        temperatureUnit: tempUnit,
        series: {
          v: { label: `Temperature (${tempLabel})`, unit: tempLabel },
          w: { label: 'Humidity (% RH)', unit: '%' },
        },
      },
    });
  } catch (err) {
    console.error('[insights/weather-stream]', err);
    return res.status(500).json({ error: 'Failed to load weather' });
  }
}
