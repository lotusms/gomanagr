/**
 * Unit tests for lib/revealPin: hashPin and verifyPin (credentials reveal PIN).
 */

const { hashPin, verifyPin } = require('@/lib/revealPin');

describe('hashPin', () => {
  it('returns null for empty string', () => {
    expect(hashPin('')).toBeNull();
  });

  it('returns null for whitespace-only', () => {
    expect(hashPin('   ')).toBeNull();
  });

  it('returns null for null/undefined (treated as empty)', () => {
    expect(hashPin(null)).toBeNull();
    expect(hashPin(undefined)).toBeNull();
  });

  it('trims input before hashing', () => {
    const a = hashPin('1234');
    const b = hashPin('  1234  ');
    expect(a).toBe(b);
  });

  it('returns a 64-char hex string for non-empty PIN', () => {
    const out = hashPin('1234');
    expect(out).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for different inputs', () => {
    expect(hashPin('1234')).not.toBe(hashPin('5678'));
  });
});

describe('verifyPin', () => {
  const userId = 'user-1';

  it('returns { ok: false, error } when supabase is missing', async () => {
    const result = await verifyPin(null, userId, '1234');
    expect(result).toEqual({ ok: false, error: 'Missing params' });
  });

  it('returns { ok: false, error } when userId is missing', async () => {
    const supabase = { from: jest.fn() };
    const result = await verifyPin(supabase, null, '1234');
    expect(result).toEqual({ ok: false, error: 'Missing params' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns { ok: false, error: "PIN is required" } when pin is empty', async () => {
    const supabase = { from: jest.fn() };
    const result = await verifyPin(supabase, userId, '');
    expect(result).toEqual({ ok: false, error: 'PIN is required' });
    const result2 = await verifyPin(supabase, userId, '   ');
    expect(result2).toEqual({ ok: false, error: 'PIN is required' });
  });

  it('returns { ok: false, error } when profile fetch errors', async () => {
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
          })),
        })),
      })),
    };
    const result = await verifyPin(supabase, userId, '1234');
    expect(result).toEqual({ ok: false, error: 'Failed to verify' });
  });

  it('returns { ok: false, error } when no row found', async () => {
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          })),
        })),
      })),
    };
    const result = await verifyPin(supabase, userId, '1234');
    expect(result).toEqual({ ok: false, error: 'Failed to verify' });
  });

  it('returns { ok: false, error } when no PIN set in profile', async () => {
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: () => Promise.resolve({ data: { profile: {} }, error: null }),
          })),
        })),
      })),
    };
    const result = await verifyPin(supabase, userId, '1234');
    expect(result).toEqual({ ok: false, error: 'No PIN set. Set one in Security settings first.' });
  });

  it('returns { ok: false, error: "Incorrect PIN" } when hash does not match', async () => {
    const storedHash = hashPin('real-pin');
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: () => Promise.resolve({
              data: { profile: { credentialsRevealPinHash: storedHash } },
              error: null,
            }),
          })),
        })),
      })),
    };
    const result = await verifyPin(supabase, userId, 'wrong-pin');
    expect(result).toEqual({ ok: false, error: 'Incorrect PIN' });
  });

  it('returns { ok: true } when PIN matches stored hash', async () => {
    const storedHash = hashPin('correct');
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: () => Promise.resolve({
              data: { profile: { credentialsRevealPinHash: storedHash } },
              error: null,
            }),
          })),
        })),
      })),
    };
    const result = await verifyPin(supabase, userId, 'correct');
    expect(result).toEqual({ ok: true });
  });
});
