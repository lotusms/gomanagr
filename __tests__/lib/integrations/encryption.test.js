/**
 * Unit tests for lib/integrations/encryption.js:
 * getEncryptionKey, encryptConfig, decryptConfig, isEncryptionConfigured.
 */

const crypto = require('crypto');

describe('integration encryption', () => {
  const originalEnv = process.env.INTEGRATION_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.INTEGRATION_ENCRYPTION_KEY = originalEnv;
    jest.resetModules();
  });

  describe('getEncryptionKey / isEncryptionConfigured', () => {
    it('returns null when INTEGRATION_ENCRYPTION_KEY is not set', () => {
      delete process.env.INTEGRATION_ENCRYPTION_KEY;
      jest.resetModules();
      const { isEncryptionConfigured } = require('@/lib/integrations/encryption');
      expect(isEncryptionConfigured()).toBe(false);
    });

    it('returns true when INTEGRATION_ENCRYPTION_KEY is set (hex)', () => {
      process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      jest.resetModules();
      const { isEncryptionConfigured } = require('@/lib/integrations/encryption');
      expect(isEncryptionConfigured()).toBe(true);
    });

    it('returns true when INTEGRATION_ENCRYPTION_KEY is set (arbitrary string)', () => {
      process.env.INTEGRATION_ENCRYPTION_KEY = 'my-secret-string-at-least-32-chars-long';
      jest.resetModules();
      const { isEncryptionConfigured } = require('@/lib/integrations/encryption');
      expect(isEncryptionConfigured()).toBe(true);
    });
  });

  describe('encryptConfig / decryptConfig', () => {
    it('returns error when key not configured', () => {
      delete process.env.INTEGRATION_ENCRYPTION_KEY;
      jest.resetModules();
      const { encryptConfig } = require('@/lib/integrations/encryption');
      const result = encryptConfig({ foo: 'bar' });
      expect(result.error).toBeDefined();
      expect(result.encrypted).toBeUndefined();
      expect(result.error).toMatch(/INTEGRATION_ENCRYPTION_KEY/);
    });

    it('encrypts and decrypts a payload when key is set', () => {
      process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      jest.resetModules();
      const { encryptConfig, decryptConfig } = require('@/lib/integrations/encryption');
      const payload = { secretKey: 'sk_test_xxx', publishableKey: 'pk_test_xxx' };
      const enc = encryptConfig(payload);
      expect(enc.error).toBeUndefined();
      expect(enc.encrypted).toBeDefined();
      expect(typeof enc.encrypted).toBe('string');
      expect(enc.encrypted).not.toContain('sk_test');

      const dec = decryptConfig(enc.encrypted);
      expect(dec.error).toBeUndefined();
      expect(dec.decrypted).toEqual(payload);
    });

    it('decrypt returns error when key not configured', () => {
      process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      jest.resetModules();
      const { encryptConfig } = require('@/lib/integrations/encryption');
      const enc = encryptConfig({ a: 1 });
      expect(enc.encrypted).toBeDefined();

      delete process.env.INTEGRATION_ENCRYPTION_KEY;
      jest.resetModules();
      const { decryptConfig } = require('@/lib/integrations/encryption');
      const dec = decryptConfig(enc.encrypted);
      expect(dec.error).toBeDefined();
      expect(dec.decrypted).toBeUndefined();
    });

    it('decrypt returns error for invalid base64', () => {
      process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      jest.resetModules();
      const { decryptConfig } = require('@/lib/integrations/encryption');
      const dec = decryptConfig('not-valid-base64!!!');
      expect(dec.error).toBeDefined();
    });

    it('decrypt returns error when no encrypted payload', () => {
      process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      jest.resetModules();
      const { decryptConfig } = require('@/lib/integrations/encryption');
      expect(decryptConfig(undefined).error).toBe('No encrypted payload');
      expect(decryptConfig(null).error).toBe('No encrypted payload');
      expect(decryptConfig('').error).toBe('No encrypted payload');
      expect(decryptConfig(123).error).toBe('No encrypted payload');
    });

    it('decrypt returns error when payload too short', () => {
      process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      jest.resetModules();
      const { decryptConfig } = require('@/lib/integrations/encryption');
      const tooShort = Buffer.alloc(10).toString('base64');
      const dec = decryptConfig(tooShort);
      expect(dec.error).toBe('Invalid encrypted payload');
    });

    it('decrypt returns error for tampered/corrupt ciphertext', () => {
      process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      jest.resetModules();
      const { encryptConfig, decryptConfig } = require('@/lib/integrations/encryption');
      const enc = encryptConfig({ a: 1 });
      const tampered = enc.encrypted.slice(0, -4) + 'AAAA';
      const dec = decryptConfig(tampered);
      expect(dec.error).toBeDefined();
      expect(dec.decrypted).toBeUndefined();
    });

    it('encrypt and decrypt work with hash-derived key (non-hex string)', () => {
      process.env.INTEGRATION_ENCRYPTION_KEY = 'my-secret-string-at-least-32-chars-long';
      jest.resetModules();
      const { encryptConfig, decryptConfig } = require('@/lib/integrations/encryption');
      const payload = { apiKey: 're_xxx' };
      const enc = encryptConfig(payload);
      expect(enc.error).toBeUndefined();
      expect(enc.encrypted).toBeDefined();
      const dec = decryptConfig(enc.encrypted);
      expect(dec.error).toBeUndefined();
      expect(dec.decrypted).toEqual(payload);
    });
  });
});
