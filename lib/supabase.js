import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
  );
}

const GLOBAL_KEY = '__gomanagrSupabase';

/**
 * Supabase defaults to Navigator.locks for cross-tab auth sync. Under Turbopack/HMR,
 * extra GoTrueClient instances or a wedged lock can hit the default 10s timeout.
 * A JS promise chain serializes auth work in this tab without the Web Locks API.
 * (Other tabs still coordinate via localStorage + BroadcastChannel; rare cross-tab races are acceptable here.)
 */
function createInProcessAuthLock() {
  const tails = new Map();
  return (name, _acquireTimeout, fn) => {
    const prev = tails.get(name) ?? Promise.resolve();
    const run = prev.then(() => fn());
    tails.set(name, run.catch(() => {}));
    return run;
  };
}

const inProcessAuthLock =
  typeof window !== 'undefined' ? createInProcessAuthLock() : null;

function createAnonClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      ...(inProcessAuthLock ? { lock: inProcessAuthLock } : {}),
      lockAcquireTimeout: 60000,
    },
  });
}

function getClient() {
  if (typeof window === 'undefined') {
    return createAnonClient();
  }
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = createAnonClient();
  }
  return globalThis[GLOBAL_KEY];
}

export const supabase = getClient();
