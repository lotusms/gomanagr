/**
 * Unit tests for utils/clientIdGenerator.js
 */

import { generateClientId } from '@/utils/clientIdGenerator';

describe('clientIdGenerator', () => {
  it('returns a string in format CL-YYYYMMDD-XXXXXX', () => {
    const id = generateClientId([]);
    expect(id).toMatch(/^CL-\d{8}-[A-Z0-9]{6}$/);
  });

  it('accepts no argument and defaults existingIds to empty array', () => {
    const id = generateClientId();
    expect(id).toMatch(/^CL-\d{8}-[A-Z0-9]{6}$/);
  });

  it('uses current date for the date prefix', () => {
    const id = generateClientId([]);
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    expect(id).toMatch(new RegExp(`^CL-${year}${month}${day}-[A-Z0-9]{6}$`));
  });

  it('does not return an id that exists in existingIds', () => {
    const existing = ['CL-20260101-AAAAAA'];
    const id = generateClientId(existing);
    expect(existing).not.toContain(id);
  });

  it('generates unique ids when called multiple times with same existingIds', () => {
    const existing = [];
    const ids = new Set();
    for (let i = 0; i < 20; i++) {
      ids.add(generateClientId(Array.from(ids)));
    }
    expect(ids.size).toBe(20);
  });

  it('avoids collision when existingIds contains generated id by appending or retrying', () => {
    const fixedDate = 'CL-20260115-XXXXXX';
    let callCount = 0;
    const originalRandom = Math.random;
    Math.random = () => {
      callCount++;
      if (callCount <= 2) return 0.1;
      return 0.9;
    };
    const id1 = generateClientId([]);
    const id2 = generateClientId([id1]);
    Math.random = originalRandom;
    expect(id2).not.toBe(id1);
    expect(id2).toMatch(/^CL-\d{8}-/);
  });

  it('enters while loop and appends char when generated id collides (lines 25-26)', () => {
    const originalRandom = Math.random;
    let callCount = 0;
    Math.random = () => {
      callCount++;
      if (callCount <= 6) return 0;
      return 0.99;
    };
    const id1 = generateClientId([]);
    callCount = 0;
    const existingIds = [id1];
    const id2 = generateClientId(existingIds);
    Math.random = originalRandom;
    expect(id2).not.toBe(id1);
    expect(id2).toMatch(/^CL-\d{8}-[A-Z0-9]{7}$/);
  });

  it('uses Date.now fallback when still colliding after 10 append attempts (lines 30-31)', () => {
    const originalRandom = Math.random;
    Math.random = () => 0;
    const id1 = generateClientId([]);
    const existingIds = [id1];
    for (let i = 1; i <= 10; i++) {
      existingIds.push(id1 + 'A'.repeat(i));
    }
    const id2 = generateClientId(existingIds);
    Math.random = originalRandom;
    expect(existingIds).not.toContain(id2);
    expect(id2).toMatch(/^CL-\d{8}-[A-Z0-9]{6}\d{4}$/);
  });
});
