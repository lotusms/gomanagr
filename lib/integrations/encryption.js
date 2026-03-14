/**
 * Server-side only. Encrypt/decrypt integration configs before storing in DB.
 * Uses INTEGRATION_ENCRYPTION_KEY from env (32 bytes or 64 hex chars). Never expose to client.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Resolve 32-byte key from env. Supports:
 * - 64 hex chars (e.g. openssl rand -hex 32)
 * - 32+ byte string (truncated/hashed to 32)
 * @returns {Buffer|null}
 */
function getEncryptionKey() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length >= 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed.slice(0, 64), 'hex');
  }
  return crypto.createHash('sha256').update(trimmed).digest();
}

/**
 * Encrypt a plaintext object for storage. Returns base64 string (iv:authTag:ciphertext).
 * @param {Object} payload - Plain object to encrypt (will be JSON.stringify'd).
 * @returns {{ encrypted: string } | { error: string }}
 */
const ENCRYPTION_KEY_ERROR =
  'Integration encryption is not configured. Add INTEGRATION_ENCRYPTION_KEY to your environment (e.g. .env.local). Generate a key with: openssl rand -hex 32';

function encryptConfig(payload) {
  const key = getEncryptionKey();
  if (!key || key.length < KEY_LENGTH) {
    return { error: ENCRYPTION_KEY_ERROR };
  }
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key.slice(0, KEY_LENGTH), iv, { authTagLength: AUTH_TAG_LENGTH });
    const str = JSON.stringify(payload);
    const enc = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, tag, enc]);
    return { encrypted: combined.toString('base64') };
  } catch (e) {
    return { error: e?.message || 'Encryption failed' };
  }
}

/**
 * Decrypt a stored ciphertext. Server-side only.
 * @param {string} encryptedBase64 - Value from config_encrypted column.
 * @returns {{ decrypted: Object } | { error: string }}
 */
function decryptConfig(encryptedBase64) {
  const key = getEncryptionKey();
  if (!key || key.length < KEY_LENGTH) {
    return { error: ENCRYPTION_KEY_ERROR };
  }
  if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
    return { error: 'No encrypted payload' };
  }
  try {
    const combined = Buffer.from(encryptedBase64, 'base64');
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      return { error: 'Invalid encrypted payload' };
    }
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key.slice(0, KEY_LENGTH), iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(tag);
    const str = decipher.update(ciphertext) + decipher.final('utf8');
    const decrypted = JSON.parse(str);
    return { decrypted };
  } catch (e) {
    return { error: e?.message || 'Decryption failed' };
  }
}

export { encryptConfig, decryptConfig };
export function isEncryptionConfigured() {
  return getEncryptionKey() != null;
}
