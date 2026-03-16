/**
 * Credentials reveal PIN: set, verify, or check status.
 * PIN is hashed (SHA-256) and stored in user_profiles.profile.credentialsRevealPinHash.
 * Used to gate viewing decrypted integration credentials in Integrations settings.
 */

import { createClient } from '@supabase/supabase-js';
import { hashPin } from '@/lib/revealPin';

const PROFILE_KEY = 'credentialsRevealPinHash';
const PIN_MIN = 4;
const PIN_MAX = 8;

let supabaseAdmin;
function getAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseAdmin;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.body?.userId?.trim();
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const supabase = getAdmin();
  if (!supabase) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const action = req.body?.action || 'verify';
  if (!['set', 'verify', 'status'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action; use set, verify, or status' });
  }

  if (action === 'status') {
    const { data: row, error } = await supabase
      .from('user_profiles')
      .select('profile')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[reveal-pin] status error', error.message);
      return res.status(500).json({ error: 'Failed to check PIN status' });
    }
    const profile = row?.profile && typeof row.profile === 'object' ? row.profile : {};
    const isSet = !!(profile[PROFILE_KEY] && String(profile[PROFILE_KEY]).length > 0);
    return res.status(200).json({ isSet });
  }

  const pin = req.body?.pin;
  if (action === 'set') {
    const raw = typeof pin === 'string' ? pin : (pin != null ? String(pin) : '');
    const trimmed = raw.trim();
    if (trimmed.length < PIN_MIN || trimmed.length > PIN_MAX) {
      return res.status(400).json({
        error: `PIN must be ${PIN_MIN}–${PIN_MAX} digits or characters`,
      });
    }
    const hashed = hashPin(trimmed);
    const { data: profileRow, error: fetchErr } = await supabase
      .from('user_profiles')
      .select('profile')
      .eq('id', userId)
      .maybeSingle();
    if (fetchErr) {
      console.error('[reveal-pin] fetch profile', fetchErr.message);
      return res.status(500).json({ error: 'Failed to load profile' });
    }
    const profile = profileRow?.profile && typeof profileRow.profile === 'object'
      ? { ...profileRow.profile }
      : {};
    profile[PROFILE_KEY] = hashed;
    const { error: updateErr } = await supabase
      .from('user_profiles')
      .update({
        profile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (updateErr) {
      console.error('[reveal-pin] update profile', updateErr.message);
      return res.status(500).json({ error: 'Failed to save PIN' });
    }
    return res.status(200).json({ ok: true });
  }

  // verify
  const { verifyPin } = await import('@/lib/revealPin');
  const result = await verifyPin(supabase, userId, pin);
  return res.status(200).json({ ok: result.ok, error: result.error });
}
