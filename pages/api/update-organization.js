/**
 * Update organization profile (name, logo, address, phone, etc.).
 * Uses service role so the update and select are not blocked by RLS.
 * Caller must be a member of the organization (any role).
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } else {
    supabaseAdmin = null;
  }
} catch (e) {
  supabaseAdmin = null;
}

const ALLOWED_KEYS = new Set([
  'name', 'logo_url', 'alt_logo_url', 'industry', 'company_size', 'company_locations', 'team_size',
  'sections_to_track', 'selected_palette',
  'address_line_1', 'address_line_2', 'city', 'state', 'postal_code', 'country', 'phone', 'website',
  'business_hours_start', 'business_hours_end', 'locations',
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { organizationId, userId, updates } = req.body || {};
  if (!organizationId || !userId || !updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Missing organizationId, userId, or updates' });
  }

  try {
    const { data: membership, error: memberErr } = await supabaseAdmin
      .from('org_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberErr || !membership) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    const filtered = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (ALLOWED_KEYS.has(key)) filtered[key] = value;
    });
    filtered.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(filtered)
      .eq('id', organizationId)
      .select();

    if (error) {
      console.error('[update-organization]', error);
      return res.status(500).json({ error: error.message || 'Failed to update organization' });
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!row) {
      return res.status(404).json({ error: 'Organization not found after update' });
    }

    return res.status(200).json(row);
  } catch (err) {
    console.error('[update-organization]', err);
    return res.status(500).json({ error: err.message || 'Failed to update organization' });
  }
}
