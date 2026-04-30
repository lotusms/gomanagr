const { readFileSync, existsSync } = require('fs');
const { join, isAbsolute } = require('path');

/**
 * Resolve path to a Firebase Admin service account JSON file.
 * Never commit that JSON; use env vars or gitignored firebase_bkp/service-account.json.
 *
 * Order: FIREBASE_SERVICE_ACCOUNT_KEY (raw JSON) handled in loadFirebaseServiceAccount —
 * GOOGLE_APPLICATION_CREDENTIALS → FIREBASE_SERVICE_ACCOUNT_PATH → firebase_bkp/service-account.json
 */
function resolveServiceAccountKeyPath(repoRoot) {
  const fromEnv =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (fromEnv) {
    const p = isAbsolute(fromEnv) ? fromEnv : join(repoRoot, fromEnv);
    if (existsSync(p)) return p;
    throw new Error(`Firebase credentials file not found: ${p}`);
  }
  const local = join(repoRoot, 'firebase_bkp', 'service-account.json');
  if (existsSync(local)) return local;
  throw new Error(
    'Firebase Admin credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS or ' +
      'FIREBASE_SERVICE_ACCOUNT_PATH to your JSON file, or place a copy at ' +
      'firebase_bkp/service-account.json (gitignored). You can also set FIREBASE_SERVICE_ACCOUNT_KEY ' +
      'to the raw JSON string (e.g. in CI secrets).'
  );
}

function loadFirebaseServiceAccount(repoRoot) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  }
  const filePath = resolveServiceAccountKeyPath(repoRoot);
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

module.exports = { loadFirebaseServiceAccount, resolveServiceAccountKeyPath };
