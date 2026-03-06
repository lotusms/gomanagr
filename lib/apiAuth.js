/**
 * Server-side API auth: derive user id from request (Bearer JWT).
 * Do not trust userId/orgId from body; use this for backup and other sensitive endpoints.
 */

import { createClient } from '@supabase/supabase-js';

let supabaseAnon = null;

function getAnon() {
  if (supabaseAnon) return supabaseAnon;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  supabaseAnon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAnon;
}

/**
 * Get authenticated user id from Authorization: Bearer <supabase_jwt>.
 * @param {import('next').NextApiRequest} req
 * @returns {Promise<string|null>} user id (Supabase auth uid) or null
 */
export async function getAuthenticatedUserId(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const anon = getAnon();
  if (!anon) return null;
  try {
    const { data: { user }, error } = await anon.auth.getUser(token);
    if (error || !user?.id) return null;
    return user.id;
  } catch (_) {
    return null;
  }
}
