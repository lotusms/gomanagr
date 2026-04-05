/**
 * Reverse geocode lat/lon to a short place label (city-style).
 * Uses OpenStreetMap Nominatim — https://nominatim.org/release-docs/develop/api/Reverse/
 * Usage policy: identify the app via User-Agent; light / non-bulk use only.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';

function clampLatLng(lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { lat: la, lon: lo };
}

function formatAddress(addr) {
  if (!addr || typeof addr !== 'object') return null;
  const locality =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.suburb ||
    addr.hamlet ||
    addr.neighbourhood ||
    addr.county;

  if (locality && addr.state && addr.country) {
    return `${locality}, ${addr.state}`;
  }
  if (locality && addr.country) {
    return `${locality}, ${addr.country}`;
  }
  if (locality) return locality;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { latitude, longitude, acceptLanguage } = req.body || {};
  const coords = clampLatLng(latitude, longitude);
  if (!coords) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  }

  const userAgent =
    process.env.NOMINATIM_USER_AGENT ||
    'GoManagr/1.0 (insights; +https://www.openstreetmap.org/copyright)';

  try {
    const url = new URL(NOMINATIM);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(coords.lat));
    url.searchParams.set('lon', String(coords.lon));
    url.searchParams.set('zoom', '12');
    url.searchParams.set('addressdetails', '1');

    const r = await fetch(url.toString(), {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
        'Accept-Language':
          typeof acceptLanguage === 'string' && acceptLanguage.trim() ? acceptLanguage.trim() : 'en',
      },
    });

    if (!r.ok) {
      console.error('[insights/reverse-geocode] Nominatim HTTP', r.status);
      return res.status(502).json({ error: 'Geocoding service unavailable' });
    }

    const data = await r.json();
    const structured = formatAddress(data.address);
    let label = structured;

    if (!label && typeof data.display_name === 'string') {
      const parts = data.display_name.split(', ').filter(Boolean);
      label = parts.slice(0, Math.min(3, parts.length)).join(', ');
    }

    if (!label) {
      return res.status(200).json({ label: null });
    }

    return res.status(200).json({
      label,
      attribution: '© OpenStreetMap contributors',
    });
  } catch (err) {
    console.error('[insights/reverse-geocode]', err);
    return res.status(500).json({ error: 'Failed to resolve place name' });
  }
}
