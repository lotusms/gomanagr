/**
 * Credentials reveal PIN: hash and verify. Server-side only.
 * Used to gate viewing decrypted integration credentials.
 */

import crypto from 'crypto';

const PROFILE_KEY = 'credentialsRevealPinHash';

export function hashPin(pin) {
  const normalized = String(pin || '').trim();
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Verify PIN for a user. Reads profile from Supabase (admin client).
 * @param {object} supabase - Supabase admin client
 * @param {string} userId - User ID
 * @param {string} pin - PIN entered by user
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function verifyPin(supabase, userId, pin) {
  if (!supabase || !userId) return { ok: false, error: 'Missing params' };
  const trimmed = String(pin ?? '').trim();
  if (!trimmed) return { ok: false, error: 'PIN is required' };
  const { data: row, error } = await supabase
    .from('user_profiles')
    .select('profile')
    .eq('id', userId)
    .maybeSingle();
  if (error || !row) return { ok: false, error: 'Failed to verify' };
  const profile = row.profile && typeof row.profile === 'object' ? row.profile : {};
  const stored = profile[PROFILE_KEY];
  if (!stored) return { ok: false, error: 'No PIN set. Set one in Security settings first.' };
  const inputHash = hashPin(trimmed);
  return { ok: inputHash === stored, error: inputHash === stored ? undefined : 'Incorrect PIN' };
}
